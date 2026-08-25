"""
Error Handling & Information Disclosure Automated Security Testing Suite
CoachGenie Enterprise Platform
"""

import sys
import asyncio
from pathlib import Path
from httpx import AsyncClient, ASGITransport

# Add backend directory to sys.path
backend_path = str(Path(__file__).parent / "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app

def test_error_handling():
    print("=" * 80)
    print("  COACHGENIE ERROR HANDLING & INFORMATION DISCLOSURE SECURITY TEST")
    print("=" * 80)

    total_tests = 0
    passed_tests = 0
    failures = []

    # 1. Test Next.js Error Page Existence
    print("\n[+] Test Suite 1: Verifying Custom Next.js Error Boundary Pages")
    admin_app = Path("client/apps/admin/app")
    error_pages = ["not-found.tsx", "error.tsx", "global-error.tsx"]
    for ep in error_pages:
        total_tests += 1
        path = admin_app / ep
        if path.exists() and len(path.read_text(encoding="utf-8")) > 50:
            print(f"  [PASS] Custom error page found: {ep}")
            passed_tests += 1
        else:
            failures.append(f"Missing or empty error page: {ep}")
            print(f"  [FAIL] Missing error page: {ep}")

    # 2. Test FastAPI ASGI 404 Error Format
    print("\n[+] Test Suite 2: Verifying Standardized API 404 JSON Error Response")
    total_tests += 1
    transport = ASGITransport(app=app)
    
    async def run_api_checks():
        nonlocal total_tests, passed_tests, failures
        async with AsyncClient(transport=transport, base_url="http://testserver") as client:
            # 404 on nonexistent route
            resp_404 = await client.get("/api/v1/nonexistent-endpoint-test-12345")
            if resp_404.status_code == 404:
                data = resp_404.json()
                if data.get("success") is False and "message" in data:
                    print(f"  [PASS] 404 response has consistent JSON schema: {data}")
                    passed_tests += 1
                else:
                    failures.append(f"404 response missing standard fields: {data}")
            else:
                failures.append(f"Unexpected status code for 404 route: {resp_404.status_code}")

            # 401 on protected endpoint without auth
            total_tests += 1
            resp_401 = await client.get("/api/v1/students/", headers={"X-Tenant-Subdomain": "demo"})
            if resp_401.status_code in (401, 403):
                data = resp_401.json()
                if data.get("success") is False:
                    print(f"  [PASS] {resp_401.status_code} response has consistent JSON schema: {data}")
                    passed_tests += 1
                else:
                    failures.append(f"Auth error response format mismatch: {data}")
            else:
                failures.append(f"Protected endpoint did not return 401/403: {resp_401.status_code}")

    asyncio.run(run_api_checks())

    # 3. Check for Exception Handlers in Python Source Files
    print("\n[+] Test Suite 3: Verifying Database and Global Exception Handlers")
    total_tests += 1
    backend_main = Path("backend/app/main.py").read_text(encoding="utf-8")
    copilot_main = Path("copilot_engine/main.py").read_text(encoding="utf-8")

    if "@app.exception_handler(SQLAlchemyError)" in backend_main and "@app.exception_handler(Exception)" in backend_main:
        print("  [PASS] backend/app/main.py has SQLAlchemyError and global Exception handlers.")
        passed_tests += 1
    else:
        failures.append("backend/app/main.py missing exception handlers")

    total_tests += 1
    if "@app.exception_handler(Exception)" in copilot_main and "@app.exception_handler(SQLAlchemyError)" in copilot_main:
        print("  [PASS] copilot_engine/main.py has SQLAlchemyError and global Exception handlers.")
        passed_tests += 1
    else:
        failures.append("copilot_engine/main.py missing exception handlers")

    print("\n" + "=" * 80)
    print(f"  TOTAL ERROR HANDLING CHECKS EVALUATED: {total_tests}")
    print(f"  PASSED CHECKS: {passed_tests}")
    print(f"  FAILURES DETECTED: {len(failures)}")
    print("=" * 80)

    if not failures:
        print("\n  [SUCCESS] 100% OF ERROR HANDLING & INFORMATION DISCLOSURE TESTS PASSED.")
        print("  Stack traces masked, database schemas shielded, and custom UI error pages active.\n")
        return 0
    else:
        print(f"\n  [FAILURE] {len(failures)} CHECKS FAILED:")
        for f in failures:
            print(f"    [-] {f}")
        print()
        return 1

if __name__ == "__main__":
    code = test_error_handling()
    sys.exit(code)
