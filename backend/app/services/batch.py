from datetime import date, datetime, timezone
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, and_, func
from app.models.batch import Batch, BatchStudent, Class, Subject
from app.models.syllabus import SyllabusItem, SyllabusProgress
from app.utils.exceptions import NotFoundError, ConflictError
from app.utils.pagination import paginate
import uuid


# ── Subjects ───────────────────────────────────────────────────

async def get_subjects(db: AsyncSession, tenant_id: str) -> list:
    result = await db.execute(
        select(Subject).where(Subject.tenant_id == tenant_id)
    )
    return result.scalars().all()


async def create_subject(db: AsyncSession, tenant_id: str, data: dict) -> Subject:
    subject = Subject(tenant_id=tenant_id, **data)
    db.add(subject)
    await db.flush()
    return subject


# ── Batch helpers ──────────────────────────────────────────────

async def _attach_student_ids(db: AsyncSession, batch: Batch) -> Batch:
    """Add .student_ids list of active students to batch object."""
    from app.models.student import Student
    result = await db.execute(
        select(BatchStudent.student_id)
        .join(Student, Student.id == BatchStudent.student_id)
        .where(
            and_(
                BatchStudent.batch_id == batch.id,
                Student.is_active == True,
            )
        )
    )
    batch.student_ids = [str(row) for row in result.scalars().all()]
    return batch


# ── Batches ────────────────────────────────────────────────────
async def get_batches_for_student(
    db: AsyncSession, tenant_id: str, student_id: str
) -> list:
    """Return all batches a student is enrolled in."""
    result = await db.execute(
        select(Batch)
        .join(BatchStudent, BatchStudent.batch_id == Batch.id)
        .where(
            and_(
                BatchStudent.student_id == student_id,
                Batch.tenant_id == tenant_id,
            )
        )
        .order_by(Batch.created_at.desc())
    )
    batches = result.scalars().all()
    return [await _attach_student_ids(db, b) for b in batches]


async def get_batches(db: AsyncSession, tenant_id: str, page: int, limit: int) -> dict:
    conditions = [Batch.tenant_id == tenant_id]
    total = (await db.execute(
        select(func.count()).select_from(Batch).where(and_(*conditions))
    )).scalar()

    result = await db.execute(
        select(Batch).where(and_(*conditions))
        .order_by(Batch.created_at.desc())
        .offset((page - 1) * limit).limit(limit)
    )
    batches = result.scalars().all()
    enriched = [await _attach_student_ids(db, b) for b in batches]
    return paginate(enriched, total, page, limit)


async def get_batch(db: AsyncSession, tenant_id: str, batch_id: str) -> Batch:
    result = await db.execute(
        select(Batch).where(and_(Batch.id == batch_id, Batch.tenant_id == tenant_id))
    )
    batch = result.scalar_one_or_none()
    if not batch:
        raise NotFoundError("Batch")
    return await _attach_student_ids(db, batch)


async def create_batch(db: AsyncSession, tenant_id: str, data: dict) -> Batch:
    batch = Batch(tenant_id=tenant_id, **data)
    db.add(batch)
    await db.flush()
    batch.student_ids = []
    return batch


# async def update_batch(db: AsyncSession, tenant_id: str,
#                        batch_id: str, data: dict) -> Batch:
#     batch = await get_batch(db, tenant_id, batch_id)
#     for key, value in data.items():
#         if value is not None:
#             setattr(batch, key, value)
#     await db.flush()
#     return await _attach_student_ids(db, batch)
async def update_batch(db: AsyncSession, tenant_id: str,
                       batch_id: str, data: dict) -> Batch:
    batch = await get_batch(db, tenant_id, batch_id)
    if "status" in data and data["status"] is not None:
        status_val = str(data["status"]).upper().strip()
        if status_val not in {"ACTIVE", "UPCOMING", "COMPLETED"}:
            raise ValueError("Invalid status. Must be ACTIVE, UPCOMING, or COMPLETED.")
        data["status"] = status_val
        if "is_active" not in data or data["is_active"] is None:
            data["is_active"] = (status_val != "COMPLETED")
    for key, value in data.items():
        if value is not None and hasattr(batch, key):
            setattr(batch, key, value)
    await db.commit()
    return await _attach_student_ids(db, batch)


async def delete_batch(db: AsyncSession, tenant_id: str, batch_id: str) -> None:
    batch = await get_batch(db, tenant_id, batch_id)
    await db.delete(batch)
    await db.commit()

# ── Enrollment ─────────────────────────────────────────────────

# async def enroll_student(db: AsyncSession, batch_id: str, student_id: str):
#     existing = await db.execute(
#         select(BatchStudent).where(
#             and_(
#                 BatchStudent.batch_id   == batch_id,
#                 BatchStudent.student_id == student_id,
#             )
#         )
#     )
#     if existing.scalar_one_or_none():
#         raise ConflictError("Student already enrolled in this batch.")
#     db.add(BatchStudent(batch_id=batch_id, student_id=student_id, enrolled_at=date.today()))
#     await db.flush()
async def enroll_student(
    db: AsyncSession, tenant_id: str, batch_id: str, student_id: str
):
    """
    FIX BUG-003: validate that both batch_id and student_id belong to
    the requesting tenant before enrolling — prevents cross-tenant enrollment.
    FIX BUG-007: use db.flush() instead of db.commit() to keep atomicity.
    """
    from app.models.student import Student

    # Verify batch belongs to this tenant
    batch_result = await db.execute(
        select(Batch).where(
            and_(Batch.id == batch_id, Batch.tenant_id == tenant_id)
        )
    )
    batch = batch_result.scalar_one_or_none()
    if not batch:
        raise NotFoundError("Batch")

    # Verify student belongs to this tenant and is active
    student_result = await db.execute(
        select(Student).where(
            and_(Student.id == student_id, Student.tenant_id == tenant_id, Student.is_active == True)
        )
    )
    if not student_result.scalar_one_or_none():
        raise NotFoundError("Active Student")

    # Verify capacity
    enrolled_count = (await db.execute(
        select(func.count(BatchStudent.student_id)).where(BatchStudent.batch_id == batch_id)
    )).scalar() or 0

    if batch.capacity and enrolled_count >= batch.capacity:
        raise ConflictError(f"Batch has reached maximum capacity ({batch.capacity} students).")

    existing = await db.execute(
        select(BatchStudent).where(
            and_(
                BatchStudent.batch_id == batch_id,
                BatchStudent.student_id == student_id,
            )
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictError("Student already enrolled in this batch.")

    enrollment = BatchStudent(
        batch_id=batch_id,
        student_id=student_id,
        enrolled_at=date.today(),
    )
    db.add(enrollment)
    await db.flush()


async def remove_student(
    db: AsyncSession, tenant_id: str, batch_id: str, student_id: str
):
    """
    FIX BUG-003: validate batch belongs to this tenant before removing.
    """
    # Verify batch belongs to this tenant
    batch_result = await db.execute(
        select(Batch).where(
            and_(Batch.id == batch_id, Batch.tenant_id == tenant_id)
        )
    )
    if not batch_result.scalar_one_or_none():
        raise NotFoundError("Batch")

    result = await db.execute(
        select(BatchStudent).where(
            and_(
                BatchStudent.batch_id   == batch_id,
                BatchStudent.student_id == student_id,
            )
        )
    )
    enrollment = result.scalar_one_or_none()
    if not enrollment:
        raise NotFoundError("Enrollment")
    await db.delete(enrollment)
    await db.commit()

async def get_batch_students(db: AsyncSession, tenant_id: str, batch_id: str) -> list:
    """Return full Student objects enrolled in a batch."""
    from app.models.student import Student
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Student)
        .options(selectinload(Student.batch_enrollments))
        .join(BatchStudent, BatchStudent.student_id == Student.id)
        .where(
            and_(
                BatchStudent.batch_id == batch_id,
                Student.tenant_id    == tenant_id,
                Student.is_active    == True,
            )
        )
    )
    return result.scalars().all()


# ── Classes ────────────────────────────────────────────────────

async def get_classes(db: AsyncSession, tenant_id: str, batch_id: str) -> list:
    result = await db.execute(
        select(Class).where(
            and_(Class.batch_id == batch_id, Class.tenant_id == tenant_id)
        ).order_by(Class.scheduled_at.asc())
    )
    return result.scalars().all()


# async def create_class(db: AsyncSession, tenant_id: str, data: dict) -> Class:
#     cls = Class(tenant_id=tenant_id, **data)
#     db.add(cls)
#     await db.flush()
#     return cls
async def create_class(db: AsyncSession, tenant_id: str, data: dict) -> Class:
    batch_result = await db.execute(
        select(Batch).where(
            and_(Batch.id == data["batch_id"], Batch.tenant_id == tenant_id)
        )
    )
    if not batch_result.scalar_one_or_none():
        raise NotFoundError("Batch")
    cls = Class(tenant_id=tenant_id, **data)
    db.add(cls)
    await db.flush()
    return cls

async def update_class(db: AsyncSession, tenant_id: str,
                       class_id: str, data: dict) -> Class:
    result = await db.execute(
        select(Class).where(and_(Class.id == class_id, Class.tenant_id == tenant_id))
    )
    cls = result.scalar_one_or_none()
    if not cls:
        raise NotFoundError("Class")
    for key, value in data.items():
        if value is not None:
            setattr(cls, key, value)
    await db.flush()
    return cls


# ── Syllabus Topics (belong to Subject) ───────────────────────

# async def get_syllabus_topics(db: AsyncSession, subject_id: str) -> list:
#     result = await db.execute(
#         select(SyllabusItem)
#         .where(SyllabusItem.subject_id == subject_id)
#         .order_by(SyllabusItem.sort_order.asc(), SyllabusItem.created_at.asc())
#     )
#     return result.scalars().all()
async def get_syllabus_topics(db: AsyncSession, tenant_id: str, subject_id: str) -> list:
    result = await db.execute(
        select(SyllabusItem)
        .where(
            and_(
                SyllabusItem.subject_id == subject_id,
                SyllabusItem.tenant_id == tenant_id,
            )
        )
        .order_by(SyllabusItem.sort_order.asc(), SyllabusItem.created_at.asc())
    )
    return result.scalars().all()

# async def create_syllabus_topic(db: AsyncSession, tenant_id: str, data: dict) -> SyllabusItem:
#     topic = SyllabusItem(tenant_id=tenant_id, **data)
#     db.add(topic)
#     await db.flush()
#     return topic
async def create_syllabus_topic(db: AsyncSession, tenant_id: str, data: dict) -> SyllabusItem:
    subject_result = await db.execute(
        select(Subject).where(
            and_(Subject.id == data["subject_id"], Subject.tenant_id == tenant_id)
        )
    )
    if not subject_result.scalar_one_or_none():
        raise NotFoundError("Subject")
    topic = SyllabusItem(tenant_id=tenant_id, **data)
    db.add(topic)
    await db.flush()
    return topic

# async def update_syllabus_topic(db: AsyncSession, topic_id: str, data: dict) -> SyllabusItem:
#     result = await db.execute(
#         select(SyllabusItem).where(SyllabusItem.id == topic_id)
#     )
#     topic = result.scalar_one_or_none()
#     if not topic:
#         raise NotFoundError("Syllabus topic")
#     for key, value in data.items():
#         if value is not None:
#             setattr(topic, key, value)
#     await db.flush()
#     return topic
async def update_syllabus_topic(db: AsyncSession, tenant_id: str, topic_id: str, data: dict) -> SyllabusItem:
    result = await db.execute(
        select(SyllabusItem).where(
            and_(SyllabusItem.id == topic_id, SyllabusItem.tenant_id == tenant_id)
        )
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise NotFoundError("Syllabus topic")
    for key, value in data.items():
        if value is not None:
            setattr(topic, key, value)
    await db.flush()
    return topic


# async def delete_syllabus_topic(db: AsyncSession, topic_id: str):
#     result = await db.execute(
#         select(SyllabusItem).where(SyllabusItem.id == topic_id)
#     )
#     topic = result.scalar_one_or_none()
#     if not topic:
#         raise NotFoundError("Syllabus topic")
#     await db.delete(topic)
#     await db.flush()
async def delete_syllabus_topic(db: AsyncSession, tenant_id: str, topic_id: str):
    result = await db.execute(
        select(SyllabusItem).where(
            and_(SyllabusItem.id == topic_id, SyllabusItem.tenant_id == tenant_id)
        )
    )
    topic = result.scalar_one_or_none()
    if not topic:
        raise NotFoundError("Syllabus topic")
    await db.delete(topic)
    await db.flush()

# ── Syllabus Progress (completion per topic per batch) ─────────

async def get_syllabus_with_progress(
    db: AsyncSession, tenant_id: str, batch_id: str, subject_id: str
) -> list:
    """
    Returns all topics for a subject, merged with their progress
    for the given batch. Result is a list of dicts.
    """
    # FIX BUG-008: added tenant_id filter — previously queried by subject_id
    # only, which could expose another tenant's syllabus topics via ID guessing.
    topics_result = await db.execute(
        select(SyllabusItem)
        .where(
            and_(
                SyllabusItem.subject_id == subject_id,
                SyllabusItem.tenant_id  == tenant_id,
            )
        )
        .order_by(SyllabusItem.sort_order.asc())
    )
    topics = topics_result.scalars().all()

    # Get all progress records for this batch
    progress_result = await db.execute(
        select(SyllabusProgress).where(
            and_(
                SyllabusProgress.batch_id  == batch_id,
                SyllabusProgress.tenant_id == tenant_id,
            )
        )
    )
    progress_map = {str(p.topic_id): p for p in progress_result.scalars().all()}

    # Merge
    merged = []
    for topic in topics:
        prog = progress_map.get(str(topic.id))
        merged.append({
            "id":           topic.id,
            "title":        topic.title,
            "description":  topic.description,
            "sort_order":   topic.sort_order,
            "status":       prog.status       if prog else "not_started",
            "notes":        prog.notes        if prog else None,
            "completed_at": str(prog.completed_at) if prog and prog.completed_at else None,
            "progress_id":  prog.id           if prog else None,
        })
    return merged


async def upsert_syllabus_progress(
    db: AsyncSession, tenant_id: str, batch_id: str,
    topic_id: str, status: str, notes: str | None = None
) -> SyllabusProgress:
    """Create or update progress for a topic in a batch."""
    result = await db.execute(
        select(SyllabusProgress).where(
            and_(
                SyllabusProgress.topic_id == topic_id,
                SyllabusProgress.batch_id == batch_id,
            )
        )
    )
    prog = result.scalar_one_or_none()

    if prog:
        prog.status = status
        if notes is not None:
            prog.notes = notes
        if status == "completed" and not prog.completed_at:
            prog.completed_at = datetime.now(timezone.utc)
        elif status != "completed":
            prog.completed_at = None
    else:
        prog = SyllabusProgress(
            tenant_id=tenant_id,
            topic_id=topic_id,
            batch_id=batch_id,
            status=status,
            notes=notes,
            completed_at=datetime.now(timezone.utc) if status == "completed" else None,
        )
        db.add(prog)

    await db.flush()
    return prog