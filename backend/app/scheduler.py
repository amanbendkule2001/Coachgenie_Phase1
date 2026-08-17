import asyncio
import logging
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from sqlalchemy import select, and_, func
from app.database import get_db

logger = logging.getLogger(__name__)
scheduler = AsyncIOScheduler()


async def create_default_templates():
    from app.models.notification import NotificationTemplate
    from app.models.tenant import Tenant

    DEFAULT_TEMPLATES = [
        {
            "name":      "Fee Due Reminder",
            "channel":   "email",
            "subject":   "Fee Due — CoachGenie",
            "body":      "Dear Parent, your ward {{studentName}}'s fee of ₹{{amount}} was due on {{dueDate}}. Please pay at the earliest.",
            "variables": ["studentName", "amount", "dueDate"],
        },
        {
            "name":      "Low Attendance Alert",
            "channel":   "email",
            "subject":   "Attendance Alert — CoachGenie",
            "body":      "Dear Parent, {{studentName}}'s attendance has dropped to {{attendancePercent}}%. Please ensure regular attendance.",
            "variables": ["studentName", "attendancePercent"],
        },
    ]

    async for db in get_db():
        try:
            tenants = (await db.execute(
                select(Tenant).where(Tenant.is_active == True)
            )).scalars().all()

            for tenant in tenants:
                for tpl in DEFAULT_TEMPLATES:
                    existing = (await db.execute(
                        select(NotificationTemplate).where(
                            and_(
                                NotificationTemplate.tenant_id == tenant.id,
                                NotificationTemplate.name == tpl["name"],
                            )
                        )
                    )).scalar_one_or_none()
                    if not existing:
                        db.add(NotificationTemplate(tenant_id=tenant.id, **tpl))

            await db.commit()
            logger.info("[SCHEDULER] Default templates created")
        except Exception as e:
            logger.error(f"[SCHEDULER] Template creation failed: {e}")


async def notify_overdue_fees():
    from app.models.fee import FeeInvoice
    from app.models.student import Student
    from app.models.user import User
    from app.models.notification import NotificationTemplate
    from app.services.notification import send_notifications
    from sqlalchemy.orm import selectinload
    from datetime import date

    async for db in get_db():
        try:
            today = date.today()
            result = await db.execute(
                select(FeeInvoice)
                .options(selectinload(FeeInvoice.student))
                .where(
                    and_(
                        FeeInvoice.status.in_(["pending", "partial"]),
                        FeeInvoice.due_date < today,
                    )
                )
            )
            invoices = result.scalars().all()

            for invoice in invoices:
                student = invoice.student
                if not student:
                    continue

                invoice.status = "overdue"

                tpl = (await db.execute(
                    select(NotificationTemplate).where(
                        and_(
                            NotificationTemplate.tenant_id == invoice.tenant_id,
                            NotificationTemplate.name.ilike("fee due reminder"),
                            NotificationTemplate.is_active == True,
                        )
                    )
                )).scalar_one_or_none()
                if not tpl:
                    continue

                user = (await db.execute(
                    select(User).where(
                        and_(
                            User.tenant_id == invoice.tenant_id,
                            User.email == student.parent_email,
                        )
                    )
                )).scalar_one_or_none()
                if not user:
                    continue

                await send_notifications(
                    db, str(invoice.tenant_id), str(tpl.id), [str(user.id)],
                    {
                        "studentName": f"{student.first_name} {student.last_name}".strip(),
                        "amount":      str(float(invoice.amount_due) - float(invoice.amount_paid)),
                        "dueDate":     str(invoice.due_date),
                    }
                )

            await db.commit()
            logger.info(f"[SCHEDULER] Processed {len(invoices)} overdue invoices")
        except Exception as e:
            logger.error(f"[SCHEDULER] Fee overdue job failed: {e}")


async def notify_low_attendance():
    """
    FIX: Replaced N+1 query loop (3 DB queries per student) with a single
    grouped SQL query that computes all attendance percentages at once.
    FIX: Added retry logic so failed notifications are retried instead of silently dropped.
    """
    from app.models.attendance import AttendanceRecord
    from app.models.student import Student
    from app.models.user import User
    from app.models.notification import NotificationTemplate
    from app.services.notification import send_notifications

    MAX_RETRIES = 3
    RETRY_DELAY = 5  # seconds

    async for db in get_db():
        try:
            templates = (await db.execute(
                select(NotificationTemplate).where(
                    and_(
                        NotificationTemplate.name == "Low Attendance Alert",
                        NotificationTemplate.is_active == True,
                    )
                )
            )).scalars().all()

            for tpl in templates:
                tenant_id = str(tpl.tenant_id)

                # FIX: Single grouped SQL query replaces 3 queries per student in a Python loop.
                attendance_stats = (await db.execute(
                    select(
                        AttendanceRecord.student_id,
                        func.count(AttendanceRecord.id).label("total"),
                        func.count(AttendanceRecord.id).filter(
                            AttendanceRecord.status == "present"
                        ).label("present_count"),
                    )
                    .where(AttendanceRecord.tenant_id == tenant_id)
                    .group_by(AttendanceRecord.student_id)
                )).all()

                # Build a map: student_id -> (total, present)
                stats_map = {
                    str(row.student_id): (row.total, row.present_count)
                    for row in attendance_stats
                    if row.total >= 5  # skip students with too few records
                }

                # Fetch only students with low attendance
                low_student_ids = [
                    sid for sid, (total, present) in stats_map.items()
                    if round((present / total) * 100, 1) < 75
                ]

                if not low_student_ids:
                    continue

                students = (await db.execute(
                    select(Student).where(
                        and_(
                            Student.tenant_id == tenant_id,
                            Student.id.in_(low_student_ids),
                            Student.is_active == True,
                        )
                    )
                )).scalars().all()

                for student in students:
                    total, present = stats_map[str(student.id)]
                    pct = round((present / total) * 100, 1)

                    user = (await db.execute(
                        select(User).where(
                            and_(
                                User.tenant_id == tenant_id,
                                User.email == student.parent_email,
                            )
                        )
                    )).scalar_one_or_none()
                    if not user:
                        continue

                    # FIX: Retry on notification failure
                    for attempt in range(1, MAX_RETRIES + 1):
                        try:
                            await send_notifications(
                                db, tenant_id, str(tpl.id), [str(user.id)],
                                {
                                    "studentName":       f"{student.first_name} {student.last_name}".strip(),
                                    "attendancePercent": str(pct),
                                }
                            )
                            break  # success — stop retrying
                        except Exception as e:
                            logger.warning(
                                f"[SCHEDULER] Low-attendance notify attempt {attempt}/{MAX_RETRIES} failed: {e}"
                            )
                            if attempt < MAX_RETRIES:
                                import asyncio
                                await asyncio.sleep(RETRY_DELAY)

            await db.commit()
            logger.info("[SCHEDULER] Low attendance check complete")
        except Exception as e:
            logger.error(f"[SCHEDULER] Low attendance job failed: {e}")


def start_scheduler():
    scheduler.add_job(
        notify_overdue_fees,
        CronTrigger(hour=9, minute=0),
        id="overdue_fees",
        replace_existing=True,
    )
    scheduler.add_job(
        notify_low_attendance,
        CronTrigger(hour=9, minute=30),
        id="low_attendance",
        replace_existing=True,
    )
    scheduler.start()
    scheduler.add_job(create_default_templates, "date", id="init_templates", replace_existing=True)
    logger.info("[SCHEDULER] Started")