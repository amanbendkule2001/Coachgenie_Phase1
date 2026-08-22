import uuid
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, case,update
from app.models.fee import FeeInvoice, FeePayment, FeeStructure
from app.models.student import Student
from app.utils.exceptions import BadRequestError, ConflictError, NotFoundError
from app.utils.pagination import paginate
from sqlalchemy.orm import selectinload
from datetime import date
from sqlalchemy import select, func, extract
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.fee import FeeInvoice


async def get_monthly_collection(db: AsyncSession, tenant_id: str) -> list:
    """
    Returns 100% accurate monthly collection trend for the rolling 12 months.
    Queries FeePayment transactions accurately scoped by tenant.
    """
    await ensure_invoices_synced(db, tenant_id)

    t_uuid = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id

    query = (
        select(
            extract("month", func.coalesce(FeePayment.paid_at, FeePayment.created_at)).label("month"),
            func.coalesce(func.sum(FeePayment.amount), 0).label("collected"),
        )
        .where(FeePayment.tenant_id == t_uuid)
        .group_by(extract("month", func.coalesce(FeePayment.paid_at, FeePayment.created_at)))
    )

    result = await db.execute(query)
    rows = result.all()

    month_map = {}
    for row in rows:
        if row.month is not None:
            month_map[int(row.month)] = float(row.collected)

    months_names = [
        "Jan", "Feb", "Mar", "Apr", "May", "Jun",
        "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ]

    current_m = date.today().month
    ordered_months = [(current_m - 11 + i - 1) % 12 + 1 for i in range(12)]

    res = []
    for m in ordered_months:
        res.append({
            "month": months_names[m - 1],
            "fees": month_map.get(m, 0.0)
        })

    return res


async def get_fee_structures(db: AsyncSession, tenant_id: str) -> list:
    result = await db.execute(
        select(FeeStructure).where(
            and_(FeeStructure.tenant_id == tenant_id, FeeStructure.is_active == True)
        )
    )
    return result.scalars().all()


async def ensure_invoices_synced(db: AsyncSession, tenant_id: str):
    t_uuid = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id

    inv_res = await db.execute(
        select(FeeInvoice)
        .options(selectinload(FeeInvoice.payments))
        .where(FeeInvoice.tenant_id == t_uuid)
    )
    existing_invoices = inv_res.scalars().all()
    inv_by_student_id = {inv.student_id: inv for inv in existing_invoices}

    stds_res = await db.execute(
        select(Student)
        .options(selectinload(Student.admission))
        .where(Student.tenant_id == t_uuid)
    )
    students = stds_res.scalars().all()

    created_or_updated = False
    for s in students:
        admission = getattr(s, "admission", None)
        raw_fee = getattr(admission, "fee_amount", None) if admission else None
        fee_amount = float(raw_fee) if raw_fee is not None else 0.0
        fee_paid = float(getattr(admission, "fee_paid", 0) or 0.0) if admission else 0.0

        inv = inv_by_student_id.get(s.id)
        if not inv:
            if fee_amount > 0 or fee_paid > 0:
                due_date = date.today()
                adm_no = admission.admission_number if admission else str(s.enrollment_no or "0001")
                inv_no = f"INV-{adm_no}" if str(adm_no).startswith("ADM-") else f"INV-ADM-{adm_no}"

                if fee_paid >= fee_amount and fee_amount > 0:
                    inv_status = "paid"
                elif fee_paid > 0:
                    inv_status = "partial"
                else:
                    inv_status = "pending"

                inv = FeeInvoice(
                    id=uuid.uuid4(),
                    tenant_id=t_uuid,
                    student_id=s.id,
                    invoice_no=inv_no,
                    amount_due=fee_amount,
                    amount_paid=fee_paid,
                    discount=0,
                    due_date=due_date,
                    status=inv_status,
                )
                db.add(inv)
                inv_by_student_id[s.id] = inv
                created_or_updated = True

                if fee_paid > 0:
                    pay_mode = getattr(admission, "payment_mode", "cash") or "cash"
                    pay_date = getattr(admission, "payment_date", date.today()) or date.today()
                    pay = FeePayment(
                        id=uuid.uuid4(),
                        tenant_id=t_uuid,
                        invoice_id=inv.id,
                        student_id=s.id,
                        amount=fee_paid,
                        payment_mode=pay_mode,
                        transaction_ref=f"REC-{inv_no}",
                        paid_at=pay_date,
                        notes="Initial admission fee payment",
                    )
                    db.add(pay)
                    created_or_updated = True
        else:
            if fee_paid > float(inv.amount_paid):
                inv.amount_paid = fee_paid
                if fee_paid >= float(inv.amount_due):
                    inv.status = "paid"
                elif fee_paid > 0:
                    inv.status = "partial"
                created_or_updated = True

    inv_list_res = await db.execute(
        select(FeeInvoice)
        .options(selectinload(FeeInvoice.payments))
        .where(FeeInvoice.tenant_id == t_uuid)
    )
    all_invoices = inv_list_res.scalars().all()

    for inv in all_invoices:
        payments_sum = sum(float(p.amount) for p in (inv.payments or []))
        inv_paid = float(inv.amount_paid or 0.0)

        diff = inv_paid - payments_sum
        if diff > 0.01:
            pay = FeePayment(
                id=uuid.uuid4(),
                tenant_id=t_uuid,
                invoice_id=inv.id,
                student_id=inv.student_id,
                amount=diff,
                payment_mode="cash",
                transaction_ref=f"REC-{inv.invoice_no}-BAL",
                paid_at=inv.updated_at or inv.created_at or date.today(),
                notes="Reconciled fee installment payment",
            )
            db.add(pay)
            created_or_updated = True
        elif payments_sum > inv_paid + 0.01:
            inv.amount_paid = payments_sum
            if payments_sum >= float(inv.amount_due):
                inv.status = "paid"
            elif payments_sum > 0:
                inv.status = "partial"
            created_or_updated = True

    if created_or_updated:
        await db.commit()


async def get_all_invoices(db: AsyncSession, tenant_id: str) -> list:
    await ensure_invoices_synced(db, tenant_id)
    result = await db.execute(
        select(FeeInvoice)
        .options(
            selectinload(FeeInvoice.student).selectinload(Student.admission),
            selectinload(FeeInvoice.payments),
        )
        .where(FeeInvoice.tenant_id == tenant_id)
        .order_by(FeeInvoice.created_at.desc())
    )
    return result.scalars().all()


async def create_fee_structure(db: AsyncSession, tenant_id: str, data: dict) -> FeeStructure:
    fs = FeeStructure(tenant_id=tenant_id, **data)
    db.add(fs)
    await db.flush()
    return fs


async def get_student_invoices(db: AsyncSession, tenant_id: str, student_id: str) -> list:
    await ensure_invoices_synced(db, tenant_id)
    result = await db.execute(
        select(FeeInvoice)
        .options(
            selectinload(FeeInvoice.student).selectinload(Student.admission),
            selectinload(FeeInvoice.payments),
        )
        .where(
            and_(FeeInvoice.tenant_id == tenant_id, FeeInvoice.student_id == student_id)
        ).order_by(FeeInvoice.due_date.asc())
    )
    return result.scalars().all()


async def get_invoice_by_id(db: AsyncSession, tenant_id: str, invoice_id: str) -> FeeInvoice | None:
    result = await db.execute(
        select(FeeInvoice)
        .options(
            selectinload(FeeInvoice.student).selectinload(Student.admission),
            selectinload(FeeInvoice.payments),
        )
        .where(
            and_(FeeInvoice.tenant_id == tenant_id, FeeInvoice.id == invoice_id)
        )
    )
    return result.scalar_one_or_none()


async def create_invoice(db: AsyncSession, tenant_id: str, data: dict) -> FeeInvoice:
    existing = await db.execute(
        select(FeeInvoice).where(
            and_(
                FeeInvoice.tenant_id  == tenant_id,
                FeeInvoice.invoice_no == data["invoice_no"]
            )
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictError("Invoice number already exists.")

    invoice = FeeInvoice(tenant_id=tenant_id, **data)
    db.add(invoice)
    await db.flush()
    return invoice


async def record_payment(db: AsyncSession, tenant_id: str, invoice_id: str,
                         received_by: str, data: dict) -> FeePayment:
    pay_amount = float(data.get("amount", 0))
    if pay_amount <= 0:
        raise BadRequestError("Payment amount must be greater than 0.")

    result = await db.execute(
        select(FeeInvoice).where(
            and_(FeeInvoice.id == invoice_id, FeeInvoice.tenant_id == tenant_id)
        ).with_for_update()
    )
    invoice = result.scalar_one_or_none()
    if not invoice:
        raise NotFoundError("Invoice")
    if invoice.status == "paid":
        raise BadRequestError("Invoice is already fully paid.")

    outstanding = float(invoice.amount_due) - float(invoice.amount_paid)
    if pay_amount > outstanding + 0.001:
        raise BadRequestError(
            f"Payment amount (₹{pay_amount:,.2f}) exceeds outstanding balance (₹{outstanding:,.2f})."
        )

    from app.models.user import User
    rec_user_id = None
    if received_by:
        try:
            u_id = uuid.UUID(str(received_by))
            u_exists = await db.scalar(select(User.id).where(User.id == u_id))
            if u_exists:
                rec_user_id = u_id
        except Exception:
            pass

    payment_data = {k: v for k, v in data.items() if k != "received_by"}

    t_uuid = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id
    inv_uuid = uuid.UUID(str(invoice_id)) if isinstance(invoice_id, str) else invoice_id
    st_uuid = uuid.UUID(str(invoice.student_id)) if isinstance(invoice.student_id, str) else invoice.student_id

    payment = FeePayment(
        id          = uuid.uuid4(),
        tenant_id   = t_uuid,
        invoice_id  = inv_uuid,
        student_id  = st_uuid,
        received_by = rec_user_id,
        **payment_data,
    )
    db.add(payment)

    new_paid = float(invoice.amount_paid) + pay_amount
    invoice.amount_paid = new_paid
    invoice.status = "paid" if new_paid >= float(invoice.amount_due) else "partial"

    # Synchronize student.admission fee_paid and payment_installment_schedule
    if invoice.student_id:
        try:
            st_res = await db.execute(
                select(Student)
                .options(selectinload(Student.admission))
                .where(Student.id == invoice.student_id)
            )
            student = st_res.scalar_one_or_none()
            if student and getattr(student, "admission", None):
                adm = student.admission
                adm.fee_paid = new_paid
                if getattr(adm, "payment_installment_schedule", None):
                    import json
                    sched_raw = adm.payment_installment_schedule
                    sched = json.loads(sched_raw) if isinstance(sched_raw, str) else sched_raw
                    slots = sched.get("installmentSchedule") or []
                    
                    # Check sum of slots vs amount_due to determine initial payment
                    slots_sum = sum(float(s.get("amount", 0)) for s in slots)
                    total_due_val = float(invoice.amount_due)
                    init_paid = max(0.0, total_due_val - slots_sum) if slots_sum > 0 and slots_sum < total_due_val else 0.0

                    rem_pool = max(0.0, new_paid - init_paid)
                    for slot in slots:
                        amt = float(slot.get("amount", 0))
                        if rem_pool >= amt and amt > 0:
                            slot["paid"] = True
                            rem_pool -= amt
                        else:
                            slot["paid"] = False
                    
                    sched["amountPaid"] = new_paid
                    sched["remaining"] = max(0.0, total_due_val - new_paid)
                    sched["paymentStatus"] = "FULL" if new_paid >= total_due_val else "PARTIAL"
                    adm.payment_installment_schedule = json.dumps(sched)
        except Exception:
            pass

    await db.commit()
    return payment


async def get_payments(db: AsyncSession, tenant_id: str, invoice_id: str) -> list:
    result = await db.execute(
        select(FeePayment).where(
            and_(FeePayment.invoice_id == invoice_id, FeePayment.tenant_id == tenant_id)
        ).order_by(FeePayment.paid_at.desc())
    )
    return result.scalars().all()


async def get_all_payments_for_tenant(db: AsyncSession, tenant_id: str, student_id: str = None) -> list:
    await ensure_invoices_synced(db, tenant_id)

    t_uuid = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id
    query = (
        select(FeePayment)
        .options(
            selectinload(FeePayment.invoice).selectinload(FeeInvoice.student),
        )
        .where(FeePayment.tenant_id == t_uuid)
    )
    if student_id:
        st_uuid = uuid.UUID(str(student_id))
        query = query.where(FeePayment.student_id == st_uuid)

    query = query.order_by(FeePayment.paid_at.desc(), FeePayment.created_at.desc())
    res = await db.execute(query)
    payments = res.scalars().all()

    formatted = []
    for p in payments:
        invoice = p.invoice
        student = invoice.student if invoice else None
        st_name = f"{student.first_name} {student.last_name}" if (student and student.first_name) else "Student"
        enr_no = student.enrollment_no if student else ""
        inv_no = invoice.invoice_no if invoice else f"INV-{str(p.id)[:6]}"
        paid_dt = p.paid_at or p.created_at

        formatted.append({
            "id": str(p.id),
            "invoice_id": str(p.invoice_id),
            "student_id": str(p.student_id),
            "student_name": st_name,
            "enrollment_no": enr_no,
            "invoice_no": inv_no,
            "amount": float(p.amount),
            "payment_mode": (p.payment_mode or "cash").upper(),
            "transaction_ref": p.transaction_ref or f"REC-{str(p.id)[:8].upper()}",
            "paid_at": paid_dt.isoformat() if paid_dt else None,
            "day_of_week": paid_dt.strftime("%A") if paid_dt else "Today",
            "formatted_date": paid_dt.strftime("%d %b %Y") if paid_dt else "",
            "notes": p.notes or "Fee Payment",
            "status": "SUCCESS",
        })
    return formatted


async def get_revenue_summary(db: AsyncSession, tenant_id: str) -> dict:
    await ensure_invoices_synced(db, tenant_id)
    t_uuid = uuid.UUID(str(tenant_id)) if isinstance(tenant_id, str) else tenant_id
    today = date.today()

    result = await db.execute(
        select(
            # Total collected = sum of amount_paid across ALL invoices
            func.coalesce(func.sum(FeeInvoice.amount_paid), 0).label("total_collected"),

            # Total invoices count
            func.count(FeeInvoice.id).label("total_invoices"),

            # Outstanding = sum of (amount_due - amount_paid - discount)
            # only for invoices that are NOT fully paid
            func.coalesce(
                func.sum(
                    case(
                        (
                            FeeInvoice.status.in_(["pending", "partial", "overdue"]),
                            FeeInvoice.amount_due
                            - FeeInvoice.amount_paid
                            - FeeInvoice.discount,
                        ),
                        else_=0,
                    )
                ),
                0,
            ).label("total_outstanding"),

            # FIX: Overdue count — derive from due_date at query time, not just stored status.
            # This prevents stale data between midnight (when invoice becomes overdue) and
            # 9 AM (when the scheduler updates the status field).
            func.count(
                case(
                    (
                        and_(
                            FeeInvoice.status.in_(["pending", "partial", "overdue"]),
                            FeeInvoice.due_date < today,
                        ),
                        FeeInvoice.id,
                    ),
                    else_=None,
                )
            ).label("overdue_count"),

            # Pending count = status is pending AND not yet overdue (due_date >= today)
            func.count(
                case(
                    (
                        and_(
                            FeeInvoice.status == "pending",
                            FeeInvoice.due_date >= today,
                        ),
                        FeeInvoice.id,
                    ),
                    else_=None,
                )
            ).label("pending_count"),
        ).where(FeeInvoice.tenant_id == t_uuid)
    )

    row = result.one()

    return {
        "total_collected":   float(row.total_collected),
        "total_outstanding": float(row.total_outstanding),
        "total_invoices":    int(row.total_invoices),
        "overdue_count":     int(row.overdue_count),
        "pending_count":     int(row.pending_count),
    }