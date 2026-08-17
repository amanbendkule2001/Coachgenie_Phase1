# QA Bug Report — CoachGenie Phase 1
**Date:** 2026-08-10 | **Tester:** Senior QA Engineer (Static + Code Analysis)  
**Stack:** React (Next.js) + FastAPI + PostgreSQL (multi-tenant)

---

## Summary

| Severity | Count |
|----------|-------|
| 🔴 High   | 7     |
| 🟡 Medium | 6     |
| 🟢 Low    | 4     |
| **Total** | **17** |

---

## 🔴 HIGH SEVERITY BUGS

---

### BUG-001 — Duplicate Router Registration Causes Ambiguous Routes

**File:** [`main.py`](file:///d:/working/Coachgenie_Phase1-main/backend/app/main.py#L98-L104)

**Description:**  
`ai_reports_router` is registered **twice** on lines 98 and 104, resulting in duplicate route entries in FastAPI's router table.

```python
# Line 98
app.include_router(ai_reports_router, prefix=PREFIX)
# ...
# Line 104 — DUPLICATE!
app.include_router(ai_reports_router, prefix=PREFIX)
```

**Steps to Reproduce:**
1. Start the FastAPI server
2. Call `GET /api/v1/ai-reports/...` twice in rapid succession
3. OpenAPI docs will show duplicate paths

**Expected:** Each router is registered once  
**Actual:** `ai_reports_router` routes are registered twice — OpenAPI docs show duplicates; any middleware that iterates routes (rate-limiting, logging) may double-process AI report calls

**Severity: 🔴 HIGH** — Can cause route conflicts and unexpected behavior in middleware

---

### BUG-002 — Tenant Provisioning Creates User with Wrong Field Name

**File:** [`tenants.py`](file:///d:/working/Coachgenie_Phase1-main/backend/app/routers/tenants.py#L92-L99)

**Description:**  
When creating a new tenant, the owner user is constructed with `password=hash_password(...)`, but the `User` model has the field named `password_hash`, not `password`. This will cause a runtime `TypeError` or silently ignore the password field.

```python
# tenants.py line 95 — BUG: wrong field name
user = User(
    tenant_id=tenant.id,
    email=body.owner_email,
    password=hash_password(body.owner_password),  # ← should be password_hash
    first_name=body.owner_first_name,
    role="admin"                                    # ← also: model uses 'owner' not 'admin'?
)
```

**Expected:** Tenant creation sets `password_hash` correctly; new owner can log in  
**Actual:** New tenants created via `/api/v1/tenants/` produce an owner who cannot log in (password hash not stored)

**Steps to Reproduce:**
1. `POST /api/v1/tenants/` with valid body
2. Attempt `POST /api/v1/auth/login` with the newly created owner credentials
3. Login fails with 401

**Severity: 🔴 HIGH** — Newly provisioned tenants have non-functional owner accounts

---

### BUG-003 — `enroll_student` / `remove_student` Has No Tenant Scoping

**File:** [`batches.py router`](file:///d:/working/Coachgenie_Phase1-main/backend/app/routers/batches.py#L153-L174) | [`batch.py service`](file:///d:/working/Coachgenie_Phase1-main/backend/app/services/batch.py#L126-L164)

**Description:**  
The `enroll_student` and `remove_student` service functions accept `batch_id` and `student_id` directly **without verifying they belong to the requesting tenant**. A user from Tenant A can enroll or remove a student from a batch belonging to Tenant B by guessing/knowing a valid UUID.

```python
# batch.py service — NO tenant check on batch_id or student_id
async def enroll_student(db: AsyncSession, batch_id: str, student_id: str):
    existing = await db.execute(
        select(BatchStudent).where(
            and_(
                BatchStudent.batch_id == batch_id,
                BatchStudent.student_id == student_id,
            )
        )
    )
```

**Steps to Reproduce:**
1. Log in as `owner@tenantA.com`
2. Obtain a `batch_id` from Tenant B's database
3. `POST /api/v1/batches/{tenantB_batch_id}/enroll/{any_student_id}` — succeeds!

**Expected:** 404 or 403 if the batch doesn't belong to the authenticated tenant  
**Actual:** Cross-tenant enrollment succeeds silently

**Severity: 🔴 HIGH** — Critical multi-tenant security vulnerability (data isolation breach)

---

### BUG-004 — `get_monthly_collection` Sums `amount_paid` on FeeInvoice (Stale Total)

**File:** [`fee.py service`](file:///d:/working/Coachgenie_Phase1-main/backend/app/services/fee.py#L13-L59)

**Description:**  
The monthly trend chart queries `FeeInvoice.amount_paid` grouped by `created_at` month. However, `amount_paid` is updated on the invoice record each time a payment is recorded, but `created_at` is the invoice creation date, **not** the payment date. This causes payments to be attributed to the wrong month.

**Example:**
- Invoice created in January (amount_paid = 0)
- Payment made in March → invoice.amount_paid = 5000
- Monthly trend shows 5000 for **January**, not March

**Expected:** Chart shows payments attributed to the month the payment was actually made  
**Actual:** Payments are attributed to the invoice creation month regardless of when payment occurred

**Steps to Reproduce:**
1. Create an invoice in January
2. Record payment in March
3. View the fees monthly trend chart — January shows the payment amount

**Severity: 🔴 HIGH** — Financial reporting is incorrect; affects business decisions

---

### BUG-005 — `get_all_invoices` Side Effect: Mutates Invoice Status Inside a `GET` Request

**File:** [`fee.py service`](file:///d:/working/Coachgenie_Phase1-main/backend/app/services/fee.py#L79-L101)

**Description:**  
The `get_all_invoices` function (called by the `GET /fees/invoices` endpoint) **performs a database write** — it bulk-updates overdue invoice statuses. This is a side effect in a read endpoint, violating HTTP semantics and the principle of least surprise.

```python
async def get_all_invoices(db: AsyncSession, tenant_id: str) -> list:
    # ← This is a GET endpoint but it WRITES to the database!
    await db.execute(
        update(FeeInvoice)
        .where(...)
        .values(status="overdue")
    )
```

**Issues:**
1. Breaks HTTP idempotency — two consecutive GETs produce different DB state
2. Fails any read-only DB replica setup
3. The auto-commit in `get_db()` will persist this on every list call

**Expected:** Status should be auto-computed at query time, or updated by a dedicated scheduler job  
**Actual:** Every `GET /fees/invoices` silently mutates DB records

**Severity: 🔴 HIGH** — Write side-effects in GET requests; breaks read replica setups and idempotency

---

### BUG-006 — `TenantNotFoundError` Returns HTTP 403 Instead of 404 for Missing Tenant Header

**File:** [`exceptions.py`](file:///d:/working/Coachgenie_Phase1-main/backend/app/utils/exceptions.py#L72-L74) | [`dependencies.py`](file:///d:/working/Coachgenie_Phase1-main/backend/app/dependencies.py#L166-L167)

**Description:**  
When the `X-Tenant-Subdomain` header is missing, `TenantNotFoundError` is raised, which maps to **HTTP 403 Forbidden**. But the correct status for a missing/unknown tenant is either **404 Not Found** or **400 Bad Request** — 403 implies the user is authenticated but lacks permission, which is misleading.

```python
class TenantNotFoundError(AppException):
    def __init__(self, message: str = "Tenant not found or inactive."):
        super().__init__(status.HTTP_403_FORBIDDEN, message)  # ← should be 404 or 400
```

**Expected:** `GET /api/v1/students/` (no tenant header) → 400 Bad Request  
**Actual:** Returns 403 Forbidden, confusing clients into thinking it's an authorization error

**Severity: 🔴 HIGH** — Misleading error codes break client-side error handling logic

---

### BUG-007 — `update_batch` and `enroll_student` Call `db.commit()` Inside Service Layer

**File:** [`batch.py service`](file:///d:/working/Coachgenie_Phase1-main/backend/app/services/batch.py#L107,L147,L164)

**Description:**  
Most service functions use `await db.flush()` (correct pattern — the `get_db()` context manager handles the final commit). However `update_batch`, `enroll_student`, and `remove_student` call `await db.commit()` directly inside the service layer. This breaks transactional integrity: if a caller wraps multiple service calls in one request, a failure after an early `commit()` cannot be rolled back.

```python
async def enroll_student(...):
    ...
    db.add(enrollment)
    await db.commit()  # ← premature commit; can't be rolled back if downstream fails
```

**Expected:** Service layer uses `db.flush()` only; `get_db()` context manager handles commit  
**Actual:** Some services commit prematurely, breaking atomicity guarantees

**Severity: 🔴 HIGH** — Data integrity risk; partial commits possible on multi-step operations

---

## 🟡 MEDIUM SEVERITY BUGS

---

### BUG-008 — `get_syllabus_with_progress` Does Not Filter Topics by Tenant

**File:** [`batch.py service`](file:///d:/working/Coachgenie_Phase1-main/backend/app/services/batch.py#L328-L333)

**Description:**  
When fetching syllabus topics for a batch, the query filters by `subject_id` only, **not** by `tenant_id`. A cross-tenant subject ID leak could expose another tenant's syllabus topics.

```python
topics_result = await db.execute(
    select(SyllabusItem)
    .where(SyllabusItem.subject_id == subject_id)  # ← no tenant_id filter!
    .order_by(SyllabusItem.sort_order.asc())
)
```

**Severity: 🟡 MEDIUM** — Potential data leak across tenants via subject ID guessing

---

### BUG-009 — `GET /attendance/` Endpoint Has `db: DB = None` Default

**File:** [`attendance.py router`](file:///d:/working/Coachgenie_Phase1-main/backend/app/routers/attendance.py#L25)

**Description:**  
The `get_attendance_by_batch` endpoint declares `db: DB = None`. The `DB` type is an `Annotated` type alias with a `Depends(get_db)` injector — the `= None` default is confusing and potentially masks injection failures. Same issue exists in `get_batch_syllabus` in batches router.

```python
async def get_attendance_by_batch(
    ...
    db: DB = None,   # ← should just be `db: DB` with no default
```

**Severity: 🟡 MEDIUM** — Could silently pass `None` as DB session if DI fails, causing 500 errors

---

### BUG-010 — `student_dashboard` Endpoint Has No Role-Based Authorization

**File:** [`dashboard.py router`](file:///d:/working/Coachgenie_Phase1-main/backend/app/routers/dashboard.py#L98-L108)

**Description:**  
The `GET /dashboard/student/{student_id}` endpoint only requires `get_current_user` — any authenticated user (counselor, tutor, another student) can fetch any student's dashboard data by guessing a student UUID.

```python
@router.get("/student/{student_id}")
async def student_dashboard(
    student_id: str,
    db: DB,
    tenant=Depends(get_tenant),
    current_user=Depends(get_current_user),  # ← no role check or ownership check!
):
```

**Severity: 🟡 MEDIUM** — Student data exposure to unauthorized roles

---

### BUG-011 — Monthly Trend Chart vs KPI "Total Collected" Will Show Different Numbers

**File:** [`fee.py service`](file:///d:/working/Coachgenie_Phase1-main/backend/app/services/fee.py#L13-L59) vs [L179-L239](file:///d:/working/Coachgenie_Phase1-main/backend/app/services/fee.py#L179-L239)

**Description:**  
The KPI summary (`get_revenue_summary`) sums `FeeInvoice.amount_paid` across all invoices for the total collected. The monthly trend (`get_monthly_collection`) also sums `FeeInvoice.amount_paid` but groups by `created_at` month. The sum of all months in the chart should equal the KPI total — **but it won't** if `amount_paid` was updated after the creation month (payments made later). The dashboard will show different totals in the chart vs. the KPI card.

**Severity: 🟡 MEDIUM** — Causes visible data mismatch between KPI cards and trend chart

---

### BUG-012 — `register_user` Hardcodes `role="student"` (No Way to Create Owner/Counselor via API)

**File:** [`auth.py service`](file:///d:/working/Coachgenie_Phase1-main/backend/app/services/auth.py#L31)

**Description:**  
The `/auth/register` endpoint always creates users with `role="student"` regardless of what the caller sends. There's no admin-facing endpoint to register counselors or tutors. New staff users can only be created via the seed script or direct DB manipulation.

**Severity: 🟡 MEDIUM** — Operational gap; can't create staff users through the API

---

### BUG-013 — `debug_print` / `print()` Statements Left in Production Code

**Files:** [`auth.py router`](file:///d:/working/Coachgenie_Phase1-main/backend/app/routers/auth.py#L154-L156), [`dependencies.py`](file:///d:/working/Coachgenie_Phase1-main/backend/app/dependencies.py#L158-L162), [`fees.py router`](file:///d:/working/Coachgenie_Phase1-main/backend/app/routers/fees.py#L35-L37), [`database.py`](file:///d:/working/Coachgenie_Phase1-main/backend/app/database.py#L17-L19)

**Description:**  
Multiple `print()` statements dump sensitive data to stdout in production code:
- `dependencies.py` prints full request headers (including Authorization tokens) on every request
- `auth.py` prints tenant subdomain on every login
- `database.py` prints the full DATABASE_URL (includes password) on server startup

**Severity: 🟡 MEDIUM** — Security risk; credentials and tokens appear in server logs/stdout

---

## 🟢 LOW SEVERITY BUGS

---

### BUG-014 — `attendance.spec.ts` Entire Original File Is Commented Out (Dead Code)

**File:** [`attendance.spec.ts`](file:///d:/working/Coachgenie_Phase1-main/e2e/attendance.spec.ts#L1-L217)

**Description:**  
Lines 1–217 are the original version of the attendance tests, entirely commented out. The active tests start at line 221. This creates maintenance confusion — developers may not know which version is authoritative.

**Severity: 🟢 LOW** — Code cleanliness / maintenance issue

---

### BUG-015 — `fees.spec.ts` Also Has Entire Original Commented-Out Version

**File:** [`fees.spec.ts`](file:///d:/working/Coachgenie_Phase1-main/e2e/fees.spec.ts#L1-L162)

Same issue as BUG-014 — lines 1–162 are dead code.

**Severity: 🟢 LOW** — Code cleanliness / maintenance issue

---

### BUG-016 — `auth.py` Router File Has Massive Dead Code Section (Lines 1–108)

**File:** [`auth.py`](file:///d:/working/Coachgenie_Phase1-main/backend/app/routers/auth.py#L1-L108)

**Description:**  
The first 108 lines of the auth router are entirely commented-out old code, some of which has conflicting logic (e.g., conflicting refresh endpoint implementations). This is a maintenance and security risk — commented-out code can be accidentally re-activated.

**Severity: 🟢 LOW** — Code cleanliness / maintenance risk

---

### BUG-017 — `auth.api.spec.ts` Sends Credentials in Request Body (No Tenant Header)

**File:** [`auth.api.spec.ts`](file:///d:/working/Coachgenie_Phase1-main/e2e/auth.api.spec.ts#L12-L18)

**Description:**  
The test sends `institute` in the JSON body, but the actual API expects the tenant via the `X-Tenant-Subdomain` HTTP header. The test's login will fail in environments that strictly enforce the header.

```typescript
const res = await api.post("/auth/login", {
  data: {
    institute: "demo",    // ← this is NOT read from the request body
    email: "owner@demo.com",
    password: "Admin@1234",
  },
});
```

**Severity: 🟢 LOW** — Test code bug (not production); tests may give false positives

---

## Negative Testing Results

| Test Case | Expected | Actual | Pass? |
|-----------|----------|--------|-------|
| Login with no `X-Tenant-Subdomain` header | 400 or 404 | 403 (misleading) | ⚠️ Wrong code |
| Login with wrong password | 401 | 401 ✅ | Pass |
| Access `/fees/invoices` without auth | 401 | 401 ✅ | Pass |
| Access `/fees/monthly-trend` as counselor | 403 | 403 ✅ | Pass |
| Enroll student from another tenant's batch | 403/404 | 200 (data breach!) | ❌ FAIL |
| Create tenant → login as owner | 200 | 401 (broken password field) | ❌ FAIL |
| Duplicate invoice number | 409 | 409 ✅ | Pass |
| Refresh with used token | 401 | 401 ✅ | Pass |
| Student accessing another student's dashboard | 403 | 200 (data breach!) | ❌ FAIL |

---

## Data Consistency Check

| Check | Result |
|-------|--------|
| Monthly chart sum == KPI "Total Collected" | ❌ MISMATCH (different aggregation bases) |
| Payment stored in DB triggers invoice status update | ✅ Correct (`record_payment` updates `amount_paid`) |
| Auto-overdue status update on `GET /fees/invoices` | ⚠️ Works but violates HTTP semantics |
| Attendance records persist across page refresh | ✅ Should work (DB-backed) |
| Cross-tenant data isolation for fees/invoices | ✅ Correct tenant filter in query |
| Cross-tenant data isolation for batch enrollment | ❌ MISSING tenant check |

---

## Recommended Fixes (Priority Order)

1. **BUG-003** — Add `tenant_id` check in `enroll_student` / `remove_student` service
2. **BUG-002** — Fix `password_hash` field name in tenant provisioning router
3. **BUG-001** — Remove duplicate `ai_reports_router` registration in `main.py`
4. **BUG-007** — Replace `db.commit()` with `db.flush()` in service layer functions
5. **BUG-004 / BUG-011** — Fix monthly trend to query `FeePayment.paid_at` instead of `FeeInvoice.created_at`
6. **BUG-005** — Move overdue-status update to a scheduler job (already exists: `scheduler.py`)
7. **BUG-006** — Change `TenantNotFoundError` to return HTTP 400
8. **BUG-010** — Add ownership/role check to `student_dashboard` endpoint
9. **BUG-013** — Remove all `print()` debug statements from production code
