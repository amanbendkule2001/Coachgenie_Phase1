# copilot_engine/models/report_models.py
"""
Minimal read-only SQLAlchemy models mirroring tables owned by `backend`.

copilot_engine and backend share the same Postgres database but are
deployed as separate services (different rootDir on Render), so we
cannot import backend's models/services directly. These models exist
purely for read access needed to build reports.

IMPORTANT: Do not use these for writes. All mutations must go through
the main backend service.
"""

import uuid
from sqlalchemy import String, Boolean, Text, Date, Numeric, SmallInteger
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID, TIMESTAMP

from copilot_engine.database.database import Base


class StudentRead(Base):
    __tablename__ = "students"
    __table_args__ = {"extend_existing": True}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    enrollment_no: Mapped[str] = mapped_column(String(50))
    first_name: Mapped[str] = mapped_column(String(100))
    last_name: Mapped[str] = mapped_column(String(100))
    email: Mapped[str] = mapped_column(String(255), nullable=True)
    phone: Mapped[str] = mapped_column(String(20), nullable=True)
    current_class: Mapped[str] = mapped_column(String(50), nullable=True)
    target_exam: Mapped[str] = mapped_column(String(150), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean)


class AttendanceSessionRead(Base):
    __tablename__ = "attendance_sessions"
    __table_args__ = {"extend_existing": True}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    class_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    session_date = mapped_column(Date)


class AttendanceRecordRead(Base):
    __tablename__ = "attendance_records"
    __table_args__ = {"extend_existing": True}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    session_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    status: Mapped[str] = mapped_column(String(20))


class ExamResultRead(Base):
    __tablename__ = "exam_results"
    __table_args__ = {"extend_existing": True}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    exam_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    marks_obtained: Mapped[float] = mapped_column(Numeric(6, 2))
    grade: Mapped[str] = mapped_column(String(5), nullable=True)
    rank_in_batch: Mapped[int] = mapped_column(SmallInteger, nullable=True)
    is_pass: Mapped[bool] = mapped_column(Boolean)
    remarks: Mapped[str] = mapped_column(Text, nullable=True)


class FeeInvoiceRead(Base):
    __tablename__ = "fee_invoices"
    __table_args__ = {"extend_existing": True}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    invoice_no: Mapped[str] = mapped_column(String(50))
    amount_due: Mapped[float] = mapped_column(Numeric(10, 2))
    amount_paid: Mapped[float] = mapped_column(Numeric(10, 2))
    status: Mapped[str] = mapped_column(String(20))
    due_date = mapped_column(Date)


class GrowthCardRead(Base):
    __tablename__ = "growth_cards"
    __table_args__ = {"extend_existing": True}

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True)
    tenant_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    student_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True))
    period_label: Mapped[str] = mapped_column(String(50))
    academic_score: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    attendance_percent: Mapped[float] = mapped_column(Numeric(5, 2), nullable=True)
    behavior_rating: Mapped[int] = mapped_column(SmallInteger, nullable=True)
    strengths: Mapped[str] = mapped_column(Text, nullable=True)
    improvement_areas: Mapped[str] = mapped_column(Text, nullable=True)
    tutor_remarks: Mapped[str] = mapped_column(Text, nullable=True)
    created_at = mapped_column(TIMESTAMP(timezone=True))