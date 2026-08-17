from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func, or_
from app.models.lead import Lead, LeadActivity
from app.utils.exceptions import NotFoundError
from app.utils.pagination import paginate


async def get_funnel(db: AsyncSession, tenant_id: str) -> list:
    from app.models.student import Student

    result = await db.execute(
        select(
            Lead.status,
            func.count(Lead.id).label("count")
        )
        .where(Lead.tenant_id == tenant_id)
        .group_by(Lead.status)
    )

    rows = result.all()

    raw_counts = {
        (row.status or "").lower(): row.count
        for row in rows
    }

    # Total active enrolled students in institute
    active_students_count = (await db.execute(
        select(func.count(Student.id))
        .where(and_(Student.tenant_id == tenant_id, Student.is_active == True))
    )).scalar() or 0

    enrolled_count = max(
        raw_counts.get("enrolled", 0) + raw_counts.get("converted", 0),
        active_students_count
    )

    enquiries_count = raw_counts.get("new", 0) + raw_counts.get("enquiry", 0) + raw_counts.get("enquiries", 0)
    contacted_count = raw_counts.get("contacted", 0) + raw_counts.get("demo_scheduled", 0)
    trial_count = raw_counts.get("interested", 0) + raw_counts.get("demo_done", 0) + raw_counts.get("negotiation", 0)
    lost_count = raw_counts.get("lost", 0)

    return [
        {"stage": "Enquiries", "count": enquiries_count},
        {"stage": "Contacted", "count": contacted_count},
        {"stage": "Trial", "count": trial_count},
        {"stage": "Enrolled", "count": enrolled_count},
        {"stage": "Lost", "count": lost_count},
    ]


# ── helper: attach batch_name to a lead object ────────────────────────────────
async def _attach_batch_name(db: AsyncSession, lead: Lead) -> Lead:
    """Fetch batch name and attach it as a non-mapped attribute."""
    if lead.batch_id:
        from app.models.batch import Batch
        batch = await db.get(Batch, lead.batch_id)
        lead.__dict__["batch_name"] = batch.name if batch else None
    else:
        lead.__dict__["batch_name"] = None
    return lead


async def get_leads(
    db: AsyncSession,
    tenant_id: str,
    page: int,
    limit: int,
    status: str | None,
    search: str | None,
    batch_id: str | None = None,       # ← NEW
) -> dict:
    conditions = [Lead.tenant_id == tenant_id]

    if status:
        conditions.append(Lead.status == status)

    if search:
        conditions.append(
            or_(
                Lead.full_name.ilike(f"%{search}%"),
                Lead.phone.ilike(f"%{search}%"),
            )
        )

    if batch_id:                                           # ← NEW
        conditions.append(Lead.batch_id == batch_id)      # ← NEW

    total = (await db.execute(
        select(func.count()).select_from(Lead).where(and_(*conditions))
    )).scalar()

    result = await db.execute(
        select(Lead).where(and_(*conditions))
        .order_by(Lead.created_at.desc())
        .offset((page - 1) * limit).limit(limit)
    )
    leads = result.scalars().all()

    # ── attach batch_name to each lead ────────────────────────────────────────
    for lead in leads:
        await _attach_batch_name(db, lead)

    return paginate(leads, total, page, limit)


async def get_lead(db: AsyncSession, tenant_id: str, lead_id: str) -> Lead:
    import uuid
    try:
        uuid_obj = uuid.UUID(str(lead_id))
    except (ValueError, TypeError):
        raise NotFoundError("Lead")

    result = await db.execute(
        select(Lead).where(and_(Lead.id == uuid_obj, Lead.tenant_id == tenant_id))
    )
    lead = result.scalar_one_or_none()
    if not lead:
        raise NotFoundError("Lead")

    # ── attach batch_name ─────────────────────────────────────────────────────
    await _attach_batch_name(db, lead)

    return lead


async def create_lead(db: AsyncSession, tenant_id: str, data: dict) -> Lead:
    lead = Lead(tenant_id=tenant_id, **data)
    db.add(lead)
    await db.flush()

    # ── attach batch_name ─────────────────────────────────────────────────────
    await _attach_batch_name(db, lead)

    return lead


async def update_lead(db: AsyncSession, tenant_id: str, lead_id: str, data: dict) -> Lead:
    lead = await get_lead(db, tenant_id, lead_id)
    for key, value in data.items():
        if value is not None:
            setattr(lead, key, value)
    await db.flush()

    # ── attach batch_name ─────────────────────────────────────────────────────
    await _attach_batch_name(db, lead)

    return lead


async def delete_lead(db: AsyncSession, tenant_id: str, lead_id: str):
    lead = await get_lead(db, tenant_id, lead_id)
    await db.delete(lead)
    await db.flush()


async def add_activity(db: AsyncSession, tenant_id: str, lead_id: str,
                       user_id: str, data: dict) -> LeadActivity:
    activity = LeadActivity(
        tenant_id=tenant_id,
        lead_id=lead_id,
        created_by=user_id,
        **data
    )
    db.add(activity)
    await db.flush()
    return activity


async def get_activities(db: AsyncSession, tenant_id: str, lead_id: str) -> list:
    result = await db.execute(
        select(LeadActivity).where(
            and_(
                LeadActivity.lead_id == lead_id,
                LeadActivity.tenant_id == tenant_id,
            )
        ).order_by(LeadActivity.created_at.desc())
    )
    return result.scalars().all()