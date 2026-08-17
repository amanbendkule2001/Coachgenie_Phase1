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
    Returns monthly collection trend. Queries FeePayment.paid_at first,
    falling back to FeeInvoice paid amounts if FeePayment has no records,
    ensuring a complete 12-month academic trend.
    """
    query = (
        select(
            extract("month", FeePayment.paid_at).label("month"),
            func.coalesce(func.sum(FeePayment.amount), 0).label("collected"),
        )
        .where(FeePayment.tenant_id == tenant_id)
        .group_by(extract("month", FeePayment.paid_at))
    )

    result = await db.execute(query)
    rows = result.all()

    month_map = {}
    for row in rows:
        if row.month is not None:
            month_map[int(row.month)] = float(row.collected)

    # Fallback to FeeInvoice amount_paid if FeePayment is empty
    if not month_map:
        inv_query = (
            select(
                extract("month", FeeInvoice.created_at).label("month"),
                func.coalesce(func.sum(FeeInvoice.amount_paid), 0).label("collected"),
            )
            .where(and_(FeeInvoice.tenant_id == tenant_id, FeeInvoice.amount_paid > 0))
            .group_by(extract("month", FeeInvoice.created_at))
        )
        inv_result = await db.execute(inv_query)
        for row in inv_result.all():
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


# async def get_all_invoices(db: AsyncSession, tenant_id: str) -> list:
#     result = await db.execute(
#         select(FeeInvoice)
#         .options(selectinload(FeeInvoice.student))
#         .where(FeeInvoice.tenant_id == tenant_id)
#         .order_by(FeeInvoice.created_at.desc())
#     )
#     return result.scalars().all()
async def ensure_invoices_synced(db: AsyncSession, tenant_id: str):
    inv_student_ids_res = await db.execute(
        select(FeeInvoice.student_id).where(FeeInvoice.tenant_id == tenant_id)
    )
    existing_student_ids = set(inv_student_ids_res.scalars().all())

    stds_res = await db.execute(
        select(Student)
        .options(selectinload(Student.admission))
        .where(Student.tenant_id == tenant_id)
    )
    students = stds_res.scalars().all()

    created_any = False
    for s in students:
        if s.id not in existing_student_ids:
            admission = getattr(s, "admission", None)
            raw_fee = getattr(admission, "fee_amount", None) if admission else None
            fee_amount = float(raw_fee) if raw_fee is not None else 0.0
            if fee_amount > 0:
                fee_paid = float(getattr(admission, "fee_paid", 0) or 0.0) if admission else 0.0
                due_date = date.today()

                adm_no = admission.admission_number if admission else str(s.enrollment_no or "0001")
                inv_no = f"INV-ADM-{adm_no}"

                if fee_paid >= fee_amount:
                    inv_status = "paid"
                elif fee_paid > 0:
                    inv_status = "partial"
                else:
                    inv_status = "pending"

                inv = FeeInvoice(
                    id=uuid.uuid4(),
                    tenant_id=tenant_id,
                    student_id=s.id,
                    invoice_no=inv_no,
                    amount_due=fee_amount,
                    amount_paid=fee_paid,
                    discount=0,
                    due_date=due_date,
                    status=inv_status,
                )
                db.add(inv)
                existing_student_ids.add(s.id)
                created_any = True

    if created_any:
        await db.flush()


async def get_all_invoices(db: AsyncSession, tenant_id: str) -> list:
    await ensure_invoices_synced(db, tenant_id)
    result = await db.execute(
        select(FeeInvoice)
        .options(
            selectinload(FeeInvoice.student).selectinload(Student.admission)
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
            selectinload(FeeInvoice.student).selectinload(Student.admission)
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
            selectinload(FeeInvoice.student).selectinload(Student.admission)
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
    # FIX: SELECT ... FOR UPDATE locks the row for the duration of this transaction,
    # preventing race conditions when two payments hit the same invoice concurrently.
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

    payment = FeePayment(
        tenant_id   = tenant_id,
        invoice_id  = invoice_id,
        student_id  = invoice.student_id,
        received_by = received_by,
        **data,
    )
    db.add(payment)

    new_paid = float(invoice.amount_paid) + float(data["amount"])
    invoice.amount_paid = new_paid
    invoice.status = "paid" if new_paid >= float(invoice.amount_due) else "partial"

    await db.flush()
    return payment


async def get_payments(db: AsyncSession, tenant_id: str, invoice_id: str) -> list:
    result = await db.execute(
        select(FeePayment).where(
            and_(FeePayment.invoice_id == invoice_id, FeePayment.tenant_id == tenant_id)
        ).order_by(FeePayment.paid_at.desc())
    )
    return result.scalars().all()


async def get_revenue_summary(db: AsyncSession, tenant_id: str) -> dict:
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
        ).where(FeeInvoice.tenant_id == tenant_id)
    )

    row = result.one()

    return {
        "total_collected":   float(row.total_collected),
        "total_outstanding": float(row.total_outstanding),
        "total_invoices":    int(row.total_invoices),
        "overdue_count":     int(row.overdue_count),
        "pending_count":     int(row.pending_count),
    }