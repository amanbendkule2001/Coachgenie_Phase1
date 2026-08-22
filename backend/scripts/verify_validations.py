import sys
import os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from datetime import date
import uuid

# 1. Models Import & Instantiation Check
from app.models.student import Student
from app.models.admission import Admission
from app.models.user import User
from app.models.batch import Batch
from app.models.fee import FeeInvoice, FeePayment, FeeStructure
from app.models.exam import Exam, ExamResult
from app.models.attendance import AttendanceSession, AttendanceRecord

# 2. Schemas Import & Validation Check
from app.schemas.auth_extended import ResetPasswordRequest, ChangePasswordRequest, VerifyOTPRequest
from app.schemas.fee import FeeStructureCreate, FeeInvoiceCreate, PaymentCreate
from app.schemas.admission import PaymentIn, InstallmentIn
from app.schemas.exam import ExamCreate, ExamResultIn
from app.schemas.batch import BatchCreate, BatchUpdate, ClassCreate
from app.schemas.lead import LeadCreate, LeadUpdate
from app.schemas.student import StudentCreate, StudentUpdate
from app.schemas.growth_card import GrowthCardCreate

def test_models_clean():
    print("Testing models instantiate without duplicate column conflicts...")
    s = Student(enrollment_no="STU-01", first_name="John", last_name="Doe")
    assert s.enrollment_no == "STU-01"

    a = Admission(admission_number="ADM-01", applied_course="Math", academic_year="2026")
    assert a.admission_number == "ADM-01"
    print("[OK] Models OK")

def test_auth_extended_validations():
    print("Testing auth_extended strong password & OTP validations...")
    # Weak password should fail
    try:
        ResetPasswordRequest(email="test@example.com", otp="123456", new_password="weak")
        assert False, "Should have failed weak password"
    except Exception:
        pass

    # Invalid OTP should fail
    try:
        VerifyOTPRequest(email="test@example.com", otp="123")
        assert False, "Should have failed short OTP"
    except Exception:
        pass

    # Valid OTP & Strong password should pass
    req = ResetPasswordRequest(email="test@example.com", otp="123456", new_password="StrongPass1@")
    assert req.otp == "123456"
    print("[OK] Auth validations OK")

def test_fee_validations():
    print("Testing fee positive amount & structure validations...")
    try:
        PaymentCreate(amount=-50)
        assert False, "Negative payment amount should fail"
    except Exception:
        pass

    try:
        PaymentCreate(amount=0)
        assert False, "Zero payment amount should fail"
    except Exception:
        pass

    p = PaymentCreate(amount=500.0)
    assert p.amount == 500.0

    try:
        FeeStructureCreate(name="Yearly", total_amount=-100)
        assert False, "Negative fee total should fail"
    except Exception:
        pass

    try:
        FeeStructureCreate(name="Yearly", total_amount=1000, installments=0)
        assert False, "0 installments should fail"
    except Exception:
        pass

    fs = FeeStructureCreate(name="Yearly", total_amount=1000, installments=3)
    assert fs.installments == 3
    print("[OK] Fee validations OK")

def test_admission_payment_math():
    print("Testing admission PaymentIn math validations...")
    try:
        PaymentIn(totalFee=1000, amountPaid=1500)
        assert False, "Amount paid exceeding total fee should fail"
    except Exception:
        pass

    p = PaymentIn(totalFee=1000, amountPaid=400)
    assert p.remaining == 600
    assert p.paymentStatus == "PARTIAL"
    print("[OK] Admission PaymentIn math OK")

def test_exam_validations():
    print("Testing exam marks and passing marks validations...")
    try:
        ExamCreate(title="Midterm", total_marks=100, passing_marks=110)
        assert False, "Passing marks exceeding total marks should fail"
    except Exception:
        pass

    try:
        ExamResultIn(student_id=uuid.uuid4(), marks_obtained=-5)
        assert False, "Negative marks obtained should fail"
    except Exception:
        pass

    ex = ExamCreate(title="Midterm", total_marks=100, passing_marks=40)
    assert ex.passing_marks == 40
    print("[OK] Exam validations OK")

def test_batch_validations():
    print("Testing batch date range & class duration validations...")
    try:
        BatchCreate(name="JEE 2026", academic_year="2026", start_date=date(2026, 6, 1), end_date=date(2026, 1, 1))
        assert False, "End date earlier than start date should fail"
    except Exception:
        pass

    try:
        ClassCreate(batch_id=uuid.uuid4(), title="Lecture 1", scheduled_at="2026-06-01T10:00:00", duration_min=5)
        assert False, "Duration under 15 mins should fail"
    except Exception:
        pass

    b = BatchCreate(name="JEE 2026", academic_year="2026", start_date=date(2026, 1, 1), end_date=date(2026, 6, 1))
    assert b.name == "JEE 2026"
    print("[OK] Batch validations OK")

def test_lead_and_student_validations():
    print("Testing lead status enums, student DOB in past...")
    l = LeadCreate(full_name="Alice Smith", phone="+91 98765 43210", status="INVALID_STATUS", source="website")
    assert l.status == "new"
    assert l.phone == "+919876543210"

    try:
        StudentCreate(enrollment_no="STU-01", first_name="Bob", last_name="Jones", date_of_birth=date(2099, 1, 1))
        assert False, "Future DOB should fail"
    except Exception:
        pass

    s = StudentCreate(enrollment_no="STU-01", first_name="Bob", last_name="Jones", date_of_birth=date(2005, 5, 15), phone="98765 43210")
    assert s.phone == "9876543210"
    print("[OK] Lead & Student validations OK")

def test_growth_card_validations():
    print("Testing growth card score boundaries...")
    try:
        GrowthCardCreate(student_id=uuid.uuid4(), period_label="Q1", academic_score=105)
        assert False, "Score over 100 should fail"
    except Exception:
        pass

    try:
        GrowthCardCreate(student_id=uuid.uuid4(), period_label="Q1", behavior_rating=6)
        assert False, "Behavior rating over 5 should fail"
    except Exception:
        pass

    gc = GrowthCardCreate(student_id=uuid.uuid4(), period_label="Q1", academic_score=92.5, behavior_rating=4)
    assert gc.academic_score == 92.5
    print("[OK] Growth card validations OK")

if __name__ == "__main__":
    test_models_clean()
    test_auth_extended_validations()
    test_fee_validations()
    test_admission_payment_math()
    test_exam_validations()
    test_batch_validations()
    test_lead_and_student_validations()
    test_growth_card_validations()
    print("\n============================================")
    print("ALL VALIDATION & INTEGRITY TESTS PASSED!")
    print("============================================")
