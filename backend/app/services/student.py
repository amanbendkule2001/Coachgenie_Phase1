import uuid
from sqlalchemy.ext.asyncio import AsyncSession
# from sqlalchemy import select, and_, func
from sqlalchemy import select, and_, func, or_
from sqlalchemy.orm import selectinload                          # ← ADD THIS
from app.models.student import Student
from app.utils.exceptions import NotFoundError, ConflictError
from app.utils.pagination import paginate
from datetime import date


# async def get_students(db: AsyncSession, tenant_id: str, page: int,
#                        limit: int, search: str | None = None) -> dict:
#     # conditions = [Student.tenant_id == tenant_id, Student.is_active == True]
#     conditions = [
#     Student.tenant_id == tenant_id
# ]
#     if search:
#         conditions.append(Student.first_name.ilike(f"%{search}%"))

#     total = (await db.execute(
#         select(func.count()).select_from(Student).where(and_(*conditions))
#     )).scalar()

#     result = await db.execute(
#         select(Student)
#         .options(selectinload(Student.batch_enrollments))        # ← ADD THIS
#         .where(and_(*conditions))
#         .order_by(Student.created_at.desc())
#         .offset((page - 1) * limit).limit(limit)
#     )
#     return paginate(result.scalars().all(), total, page, limit)
async def get_students(db: AsyncSession, tenant_id: str, page: int,limit: int, search: str | None = None)-> dict:

    conditions = [
        Student.tenant_id == tenant_id
    ]

    if search:
        conditions.append(
            or_(
                Student.first_name.ilike(f"%{search}%"),
                Student.last_name.ilike(f"%{search}%"),
                Student.email.ilike(f"%{search}%"),
                Student.phone.ilike(f"%{search}%"),
                Student.enrollment_no.ilike(f"%{search}%"),
            )
        )

    total = (
        await db.execute(
            select(func.count())
            .select_from(Student)
            .where(and_(*conditions))
        )
    ).scalar()

    result = await db.execute(
        select(Student)
        .options(selectinload(Student.batch_enrollments))
        .where(and_(*conditions))
        .order_by(Student.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )

    return paginate(result.scalars().all(), total, page, limit)


async def get_student(db: AsyncSession, tenant_id: str, student_id: str) -> Student:
    result = await db.execute(
        select(Student)
        .options(selectinload(Student.batch_enrollments))        # ← ADD THIS
        .where(
            and_(Student.id == student_id, Student.tenant_id == tenant_id)
        )
    )
    student = result.scalar_one_or_none()
    if not student:
        raise NotFoundError("Student")
    return student


async def update_student(
    db: AsyncSession,
    tenant_id: str,
    student_id: str,
    data: dict
) -> Student:
    student = await get_student(db, tenant_id, student_id)

    allowed_fields = {
        "first_name", "last_name", "email", "phone",
        "current_class", "date_of_birth", "parent_name", "parent_phone",
    }

    for key, value in data.items():
        if key in allowed_fields and value is not None:
            setattr(student, key, value)

    # flush to write changes; get_db() will commit on clean exit.
    await db.flush()
    await db.refresh(student, ["batch_enrollments"])
    return student


async def deactivate_student(db: AsyncSession, tenant_id: str, student_id: str):
    student = await get_student(db, tenant_id, student_id)
    student.is_active = False
    await db.flush()  # get_db() commits on clean exit.
    await db.refresh(student)
    return student