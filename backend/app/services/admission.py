import json
import uuid
from datetime import datetime
from sqlalchemy import select, func, and_, or_
from sqlalchemy.orm import selectinload
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.admission import Admission
from app.models.student import Student
from app.models.lead import Lead
from app.utils.exceptions import NotFoundError
from app.utils.pagination import paginate
from app.models.fee import FeeInvoice, FeePayment
from datetime import date as date_type

# ── Admission number generator ─────────────────────────────────────────────────
async def next_admission_no(db: AsyncSession, tenant_id: str) -> str:
    year   = datetime.now().year
    prefix = f"ADM-{year}-"
    result = await db.execute(
        select(func.max(Admission.admission_number)).where(
            Admission.tenant_id == tenant_id,
            Admission.admission_number.like(f"{prefix}%"),
        )
    )
    last: str | None = result.scalar()
    if last:
        try:
            last_seq = int(last.replace(prefix, ""))
        except ValueError:
            last_seq = 0
    else:
        last_seq = 0
    return f"{prefix}{str(last_seq + 1).zfill(4)}"


# ── Enrollment number generator ────────────────────────────────────────────────
async def next_enrollment_no(db: AsyncSession, tenant_id: str) -> str:
    year   = datetime.now().year
    prefix = f"STU-{year}-"
    result = await db.execute(
        select(func.max(Student.enrollment_no)).where(
            Student.tenant_id == tenant_id,
            Student.enrollment_no.like(f"{prefix}%"),
        )
    )
    last: str | None = result.scalar()
    if last:
        try:
            last_seq = int(last.replace(prefix, ""))
        except ValueError:
            last_seq = 0
    else:
        last_seq = 0
    return f"{prefix}{str(last_seq + 1).zfill(4)}"


# ── CRUD ───────────────────────────────────────────────────────────────────────
async def get_admissions(
    db: AsyncSession,
    tenant_id: str,
    page: int,
    limit: int,
    status: str | None,
) -> dict:
    conditions = [Admission.tenant_id == tenant_id]
    if status:
        conditions.append(Admission.status == status)

    total = await db.scalar(
        select(func.count()).select_from(Admission).where(and_(*conditions))
    )
    rows = await db.execute(
        select(Admission).where(and_(*conditions))
        .order_by(Admission.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    return paginate(rows.scalars().all(), total, page, limit)


async def get_admission(
    db: AsyncSession, tenant_id: str, admission_id: str
) -> Admission:
    result = await db.execute(
        select(Admission).where(
            and_(
                Admission.id == admission_id,
                Admission.tenant_id == tenant_id,
            )
        )
    )
    admission = result.scalar_one_or_none()
    if not admission:
        raise NotFoundError("Admission")

    # Always sync fee_paid from the live FeeInvoice so Admissions page
    # always shows the authoritative amount matching the Fees module.
    try:
        inv_res = await db.execute(
            select(FeeInvoice).where(
                and_(
                    FeeInvoice.tenant_id == str(admission.tenant_id),
                    FeeInvoice.invoice_no == f"INV-{admission.admission_number}",
                )
            )
        )
        live_inv = inv_res.scalar_one_or_none()
        if live_inv:
            live_paid = float(live_inv.amount_paid or 0)
            if live_paid != float(admission.fee_paid or 0):
                admission.fee_paid = live_paid
                # Also update the JSON schedule amountPaid if present
                if admission.payment_installment_schedule:
                    try:
                        sched = json.loads(admission.payment_installment_schedule)
                        sched["amountPaid"] = live_paid
                        sched["remaining"] = max(0.0, float(live_inv.amount_due or 0) - live_paid)
                        admission.payment_installment_schedule = json.dumps(sched)
                    except Exception:
                        pass
                await db.flush()
    except Exception:
        pass

    return admission


async def create_admission(
    db: AsyncSession, tenant_id: str, data: dict
) -> Admission:
    
   
    admission_number = await next_admission_no(db, tenant_id)

    # Serialize payment object → JSON text for storage
    payment_data = data.get("payment")
    payment_json: str | None = None

    # Serialize payment → JSON (always, regardless of batch)
    if payment_data:
        payment_json = json.dumps(
            payment_data if isinstance(payment_data, dict)
            else payment_data.model_dump()
        )

    # Parse batch_id UUID
    # batch_id_raw = data.get("batch_id")
    # batch_id_val = None
    # if batch_id_raw:
    #     try:
    #         batch_id_val = uuid.UUID(str(batch_id_raw))
    #     except Exception:
    #         print("INVALID batch_id:", batch_id_raw)
    batch_id_raw = data.get("batch_id")
    batch_id_val = None
    if batch_id_raw:
        try:
            batch_id_val = uuid.UUID(str(batch_id_raw))
        except (ValueError, AttributeError, TypeError):
            raise ValueError(f"Invalid batch_id: {batch_id_raw!r}")

    admission = Admission(
        id               = uuid.uuid4(),
        tenant_id        = tenant_id,
        admission_number = admission_number,
        academic_year    = data.get("academic_year") or str(datetime.now().year),
        applied_course   = data.get("applied_course") or data.get("batchName") or "N/A",
        status           = data.get("status", "PENDING_DOCS"),
        documents_verified = data.get("documents_verified", False),
        remarks          = data.get("remarks") or data.get("notes"),
        lead_id          = data.get("lead_id"),
        student_name     = data.get("student_name") or data.get("studentName"),
        phone            = data.get("phone"),
        email            = data.get("email"),
        parent_name      = data.get("parent_name"),
        parent_phone     = data.get("parent_phone"),
        school_name      = data.get("school_name"),
        grade            = data.get("grade"),
        board_name       = data.get("board_name"),
        batch_name = data.get("batch_name") or data.get("batchName"),
        batch_id   = batch_id_val,
        fee_amount                   = data.get("fee_amount") or 0,
        fee_paid                     = data.get("fee_paid") or 0,
        payment_installment_schedule = payment_json,
        documents = data.get("documents") or [],
        subjects  = [s for s in (data.get("subjects") or []) if s and s != "N/A"],
    )
    db.add(admission)
    await db.flush()

    # Always create the linked student record immediately on admission creation
    await generate_student_from_admission(db, admission)
    
        
    return admission


async def update_admission(
    db: AsyncSession,
    tenant_id: str,
    admission_id: str,
    data: dict,
    updated_by: str | None = None,
) -> Admission:
    admission = await get_admission(db, tenant_id, admission_id)

    was_confirmed = admission.status == "CONFIRMED"

    if "payment" in data and data["payment"] is not None:
        payment_data = data["payment"]
        admission.payment_installment_schedule = json.dumps(
            payment_data if isinstance(payment_data, dict)
            else (payment_data.model_dump() if hasattr(payment_data, "model_dump") else payment_data)
        )

    for key, value in data.items():
        if key != "payment" and hasattr(admission, key) and value is not None:
            setattr(admission, key, value)
    if updated_by:
        admission.updated_by = updated_by

    await db.flush()

    # Synchronize linked FeeInvoice in PostgreSQL DB
    try:
        new_fee_amount = float(getattr(admission, "fee_amount", 0) or 0)
        new_fee_paid   = float(getattr(admission, "fee_paid", 0) or 0)

        inv_res = await db.execute(
            select(FeeInvoice).options(selectinload(FeeInvoice.payments)).where(
                and_(
                    FeeInvoice.tenant_id == str(admission.tenant_id),
                    FeeInvoice.invoice_no == f"INV-{admission.admission_number}",
                )
            )
        )
        inv = inv_res.scalar_one_or_none()
        if inv:
            if new_fee_amount > 0:
                inv.amount_due = new_fee_amount
            inv.amount_paid = new_fee_paid
            inv.status = "paid" if new_fee_paid >= float(inv.amount_due) else ("partial" if new_fee_paid > 0 else "pending")
            if admission.payment_installment_schedule:
                inv.payment_installment_schedule = admission.payment_installment_schedule

            # Synchronize FeePayment records
            payments = list(inv.payments or [])
            payments_sum = sum(float(p.amount) for p in payments)
            if payments_sum > new_fee_paid + 0.01:
                excess = payments_sum - new_fee_paid
                for p in sorted(payments, key=lambda x: x.created_at or datetime.min, reverse=True):
                    p_amt = float(p.amount)
                    if excess <= 0:
                        break
                    if p_amt <= excess + 0.01:
                        excess -= p_amt
                        await db.delete(p)
                    else:
                        p.amount = p_amt - excess
                        excess = 0
            elif new_fee_paid > payments_sum + 0.01:
                diff = new_fee_paid - payments_sum
                t_uuid = uuid.UUID(str(admission.tenant_id)) if isinstance(admission.tenant_id, str) else admission.tenant_id
                st_id = inv.student_id
                pay = FeePayment(
                    id=uuid.uuid4(),
                    tenant_id=t_uuid,
                    invoice_id=inv.id,
                    student_id=st_id,
                    amount=diff,
                    payment_mode="cash",
                    transaction_ref=f"REC-{inv.invoice_no}-{int(datetime.now().timestamp())}",
                    paid_at=datetime.now(),
                    notes="Installment payment updated from Admissions",
                )
                db.add(pay)
            await db.flush()
    except Exception:
        pass

    # ── Bug 1 fix: generate student when status transitions to CONFIRMED ──
    if not was_confirmed and admission.status == "CONFIRMED":
        await generate_student_from_admission(db, admission)

    return admission

# ── Approve ────────────────────────────────────────────────────────────────────
async def approve_admission(
    db: AsyncSession,
    tenant_id: str,
    admission_id: str,
    approved_by: str,
) -> Admission:
    admission = await get_admission(db, tenant_id, admission_id)
    if admission.status == "CONFIRMED":
        return admission  # idempotent
    admission.status      = "CONFIRMED"
    admission.approved_by = approved_by
    admission.approved_at = datetime.now()
    await db.flush()
    return admission


# ── Reject ─────────────────────────────────────────────────────────────────────
async def reject_admission(
    db: AsyncSession,
    tenant_id: str,
    admission_id: str,
    updated_by: str,
    reason: str | None = None,
) -> Admission:
    admission = await get_admission(db, tenant_id, admission_id)
    admission.status     = "REJECTED"
    admission.updated_by = updated_by
    if reason:
        admission.remarks = reason
    await db.flush()
    return admission


# # ── Core: generate student from admission ──────────────────────────────────────
# # This is the SINGLE function both paths call.
# # lead_id=None  → walk-in path (direct admission)
# # lead_id set   → lead-conversion path
# # Both produce identical Student records.
# async def generate_student_from_admission(
#     db: AsyncSession,
#     admission: Admission,
# ) -> Student:
#     # Guard: already generated
#     from sqlalchemy import and_
#     existing = await db.scalar(
#         select(Student).where(
#             and_(
#                 Student.tenant_id   == admission.tenant_id,
#                 Student.admission_id == admission.id,
#             )
#         )
#     )
#     if existing:
#         return existing

#     # Fetch linked lead for contact data (lead-path only)
#     lead: Lead | None = None
#     if admission.lead_id:
#         lead = await db.get(Lead, admission.lead_id)

#     # Split full name into first / last
#     full_name  = (admission.student_name or "").strip()
#     parts      = full_name.split(" ", 1)
#     first_name = parts[0] or "Unknown"
#     last_name  = parts[1] if len(parts) > 1 else ""

#     enrollment_no = await next_enrollment_no(db, str(admission.tenant_id))

   
#     student = Student(
#         id            = uuid.uuid4(),
#         tenant_id     = admission.tenant_id,
#         admission_id  = admission.id,
#         enrollment_no = enrollment_no,
#         first_name    = first_name,
#         last_name     = last_name,
#         current_class = admission.grade or "",
#         is_active     = True,
#         joined_at     = datetime.now().date(),
#         email         = (lead.email                  if lead else None) or admission.email,
#         phone         = (lead.phone                  if lead else None) or admission.phone,
#         parent_name   = (lead.parent_name            if lead else None) or admission.parent_name,
#         parent_phone  = (lead.parent_contact_number  if lead else None) or admission.parent_phone,
#         school_name   = (lead.school_name            if lead else None) or admission.school_name,
#         target_exam   = lead.interested_course if lead else None,
#         subjects      = [s for s in (admission.subjects or []) if s and s != "N/A"],
#     )
#     db.add(student)
#     await db.flush()

#     if admission.batch_id:
#         from app.models.batch import Batch, BatchStudent
#         batch = await db.get(Batch, admission.batch_id)
#         if batch:
#             existing = await db.scalar(
#                 select(BatchStudent).where(
#                     and_(
#                         BatchStudent.batch_id   == batch.id,
#                         BatchStudent.student_id == student.id,
#                     )
#                 )
#             )
#             if not existing:
#                 db.add(BatchStudent(
#                     batch_id    = batch.id,
#                     student_id  = student.id,
#                     enrolled_at = datetime.now().date(),
#                 ))
#                 await db.flush()


#     fee_amount = float(getattr(admission, "fee_amount", 0) or 0)
#     fee_paid   = float(getattr(admission, "fee_paid",   0) or 0)

#     if fee_amount > 0:
#         if fee_paid >= fee_amount:
#             inv_status = "paid"
#         elif fee_paid > 0:
#             inv_status = "partial"
#         else:
#             inv_status = "pending"

#         # Parse due date from installment schedule
#         due_date = date_type.today()
#         try:
#             sched_raw = admission.payment_installment_schedule
#             if sched_raw:
#                 sched = json.loads(sched_raw) if isinstance(sched_raw, str) else sched_raw
#                 slots = sched.get("installmentSchedule") or []
#                 if slots and slots[0].get("dueDate"):
#                     due_date = date_type.fromisoformat(slots[0]["dueDate"])
#         except Exception:
#             pass

#         # Check if invoice already exists
#         existing_inv = await db.scalar(
#             select(FeeInvoice).where(
#                 FeeInvoice.invoice_no == f"INV-{admission.admission_number}"
#             )
#         )
#         if not existing_inv:
#             invoice = FeeInvoice(
#                 tenant_id   = str(admission.tenant_id),
#                 student_id  = student.id,
#                 invoice_no  = f"INV-{admission.admission_number}",
#                 amount_due  = fee_amount,
#                 amount_paid = fee_paid,
#                 discount    = 0,
#                 due_date    = due_date,
#                 status      = inv_status,
#             )
#             db.add(invoice)
#             await db.flush()
            
#     return student

# ── Core: generate student from admission ──────────────────────────────────────
# This is the SINGLE function both paths call.
# lead_id=None  → walk-in path (direct admission)
# lead_id set   → lead-conversion path
# Both produce identical Student records.
async def generate_student_from_admission(
    db: AsyncSession,
    admission: Admission,
) -> Student:
    from sqlalchemy import and_

    # Guard: student already generated for this admission
    student = await db.scalar(
        select(Student).where(
            and_(
                Student.tenant_id   == admission.tenant_id,
                Student.admission_id == admission.id,
            )
        )
    )

    if not student:
        # Fetch linked lead for contact data (lead-path only)
        lead: Lead | None = None
        if admission.lead_id:
            lead = await db.get(Lead, admission.lead_id)

        # Split full name into first / last
        full_name  = (admission.student_name or "").strip()
        parts      = full_name.split(" ", 1)
        first_name = parts[0] or "Unknown"
        last_name  = parts[1] if len(parts) > 1 else ""

        enrollment_no = await next_enrollment_no(db, str(admission.tenant_id))

        student = Student(
            id            = uuid.uuid4(),
            tenant_id     = admission.tenant_id,
            admission_id  = admission.id,
            enrollment_no = enrollment_no,
            first_name    = first_name,
            last_name     = last_name,
            current_class = admission.grade or "",
            is_active     = True,
            joined_at     = datetime.now().date(),
            email         = (lead.email                  if lead else None) or admission.email,
            phone         = (lead.phone                  if lead else None) or admission.phone,
            parent_name   = (lead.parent_name            if lead else None) or admission.parent_name,
            parent_phone  = (lead.parent_contact_number  if lead else None) or admission.parent_phone,
            school_name   = (lead.school_name            if lead else None) or admission.school_name,
            target_exam   = lead.interested_course if lead else None,
            subjects      = [s for s in (admission.subjects or []) if s and s != "N/A"],
        )
        db.add(student)
        await db.flush()

        if admission.batch_id:
            from app.models.batch import Batch, BatchStudent
            batch = await db.get(Batch, admission.batch_id)
            if batch:
                existing_bs = await db.scalar(
                    select(BatchStudent).where(
                        and_(
                            BatchStudent.batch_id   == batch.id,
                            BatchStudent.student_id == student.id,
                        )
                    )
                )
                if not existing_bs:
                    db.add(BatchStudent(
                        batch_id    = batch.id,
                        student_id  = student.id,
                        enrolled_at = datetime.now().date(),
                    ))
                    await db.flush()

    # ── Invoice creation is now independent of whether the student already
    #    existed — it's keyed off the admission itself, so it still runs
    #    when fee_amount is set/updated AFTER the student was first created
    #    (e.g. admission confirmed later with fee details filled in). ──
    raw_fee_amount = getattr(admission, "fee_amount", None)
    fee_amount = float(raw_fee_amount) if raw_fee_amount is not None else 0.0
    fee_paid   = float(getattr(admission, "fee_paid", 0) or 0.0)

    if fee_amount > 0:
        existing_inv = await db.scalar(
            select(FeeInvoice).where(
                and_(
                    FeeInvoice.invoice_no == f"INV-{admission.admission_number}",
                    FeeInvoice.tenant_id  == str(admission.tenant_id),
                )
            )
        )

        if fee_paid >= fee_amount:
            inv_status = "paid"
        elif fee_paid > 0:
            inv_status = "partial"
        else:
            inv_status = "pending"

        # Parse due date from installment schedule
        due_date = date_type.today()
        try:
            sched_raw = admission.payment_installment_schedule
            if sched_raw:
                sched = json.loads(sched_raw) if isinstance(sched_raw, str) else sched_raw
                slots = sched.get("installmentSchedule") or []
                if slots and slots[0].get("dueDate"):
                    due_date = date_type.fromisoformat(slots[0]["dueDate"])
        except Exception:
            pass

        if existing_inv:
            existing_inv.amount_due = fee_amount
            existing_inv.amount_paid = fee_paid
            existing_inv.status = inv_status
            existing_inv.due_date = due_date
            inv_obj = existing_inv
        else:
            invoice = FeeInvoice(
                tenant_id   = str(admission.tenant_id),
                student_id  = student.id,
                invoice_no  = f"INV-{admission.admission_number}",
                amount_due  = fee_amount,
                amount_paid = fee_paid,
                discount    = 0,
                due_date    = due_date,
                status      = inv_status,
            )
            db.add(invoice)
            inv_obj = invoice
        await db.flush()

        if fee_paid > 0:
            existing_pay = await db.scalar(
                select(FeePayment).where(
                    FeePayment.invoice_id == inv_obj.id,
                    FeePayment.tenant_id == str(admission.tenant_id),
                )
            )
            if not existing_pay:
                pay_mode = getattr(admission, "payment_mode", None) or "cash"
                pay_date = getattr(admission, "payment_date", None) or date_type.today()
                try:
                    if admission.payment_installment_schedule:
                        raw_sched = json.loads(admission.payment_installment_schedule) if isinstance(admission.payment_installment_schedule, str) else admission.payment_installment_schedule
                        if isinstance(raw_sched, dict):
                            pay_mode = raw_sched.get("modeOfPayment") or raw_sched.get("paymentMode") or pay_mode
                            if raw_sched.get("dateOfPayment"):
                                pay_date = date_type.fromisoformat(str(raw_sched["dateOfPayment"]))
                except Exception:
                    pass
                pay = FeePayment(
                    tenant_id=str(admission.tenant_id),
                    invoice_id=inv_obj.id,
                    student_id=student.id,
                    amount=fee_paid,
                    payment_mode=pay_mode,
                    transaction_ref=f"REC-{inv_obj.invoice_no}",
                    paid_at=pay_date,
                    notes="Initial admission fee payment",
                )
                db.add(pay)
                await db.flush()

    return student



# ── Lead conversion: atomic, single entry point ────────────────────────────────
async def convert_lead(
    db: AsyncSession,
    tenant_id: str,
    lead_id: str,
    converted_by: str,
    admission_data: dict | None = None,
) -> tuple[Admission, Student]:

    from sqlalchemy import and_
    from app.utils.exceptions import ConflictError

    # 1. Fetch lead
    lead_result = await db.execute(
        select(Lead).where(
            and_(Lead.id == lead_id, Lead.tenant_id == tenant_id)
        )
    )
    lead = lead_result.scalar_one_or_none()
    if not lead:
        raise NotFoundError("Lead")
    if lead.status == "converted":
        raise ConflictError("Lead is already converted.")

    # 2. Check no admission exists for this lead yet
    existing_adm = await db.scalar(
        select(Admission).where(
            and_(
                Admission.tenant_id == tenant_id,
                Admission.lead_id   == lead_id,
            )
        )
    )
    if existing_adm:
        raise ConflictError("An admission already exists for this lead.")

    # 3. Create admission from lead data
    data = {
        "lead_id":       str(lead.id),
        "student_name":  lead.full_name,
        "phone":         lead.phone,
        "email":         lead.email,
        "parent_name":   lead.parent_name,
        "parent_phone":  lead.parent_contact_number or lead.parent_phone,
        "school_name":   lead.school_name,
        "grade":         lead.grade,
        "board_name":    lead.board_name,
        "applied_course": lead.interested_course or "N/A",
        "status":        "CONFIRMED",
        "documents_verified": False,                  # ← was wrongly set to lead.documents
        "documents":          lead.documents or [],   # ← documents in correct field
        "subjects":           lead.subjects or [],
        **(admission_data or {}),
    }
    admission = await create_admission(db, tenant_id, data)

    # 4. Auto-approve and generate student
    admission.status      = "CONFIRMED"
    admission.approved_by = converted_by
    admission.approved_at = datetime.now()
    await db.flush()

    student = await generate_student_from_admission(db, admission)

    # 5. Mark lead as converted
    lead.status       = "converted"
    lead.converted_at = datetime.now()
    await db.flush()

    return admission, student