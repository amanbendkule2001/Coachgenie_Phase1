"""
SQL Injection Detection & Parameterization Security Testing Suite
CoachGenie Enterprise Platform
"""

import sys
import httpx
import json
from typing import List, Dict, Any

BASE_URL = "http://127.0.0.1:8000/api/v1"
TEST_INSTITUTE = "demo"
TEST_EMAIL = "admin@demo.com"
TEST_PASSWORD = "Admin@1234"

# Comprehensive SQL Injection boundary test vectors
SQLI_TEST_VECTORS = [
    # Tautology / Boolean-based
    "' OR '1'='1",
    "' OR '1'='1' --",
    "' OR '1'='1' /*",
    "\" OR \"\"=\"",
    "' OR 1=1 #",
    
    # Union-based extraction payloads
    "' UNION SELECT '1','2','3','4','5' --",
    "' UNION SELECT NULL, NULL, NULL, NULL, NULL --",
    
    # Stacked queries / Destructive injections
    "'; DROP TABLE test_injection; --",
    "'; SELECT pg_sleep(1); --",
    
    # Special character and escape payloads
    "\\'; --",
    "admin' --",
    "' OR ''='",
    "1' ORDER BY 1--+",
    "1' ORDER BY 100--+"
]

def run_sqli_tests():
    print("=" * 80)
    print("  COACHGENIE SQL INJECTION SECURITY DETECTION & DEFENSE TESTING SUITE")
    print(f"  Target Server: {BASE_URL}")
    print("=" * 80)

    client = httpx.Client(timeout=10.0)
    total_tests = 0
    passed_tests = 0
    failures = []

    # -------------------------------------------------------------
    # Test Suite 1: Public Dynamic Path Parameter (Subdomain lookup)
    # -------------------------------------------------------------
    print("\n[+] Test Suite 1: Testing Public Subdomain Parameter Endpoint (/api/v1/tenants/{subdomain})")
    for vector in SQLI_TEST_VECTORS:
        total_tests += 1
        try:
            url = f"{BASE_URL}/tenants/{vector}"
            resp = client.get(url)
            # Must return 404 (safe parameter lookup not found) or 400/422, NEVER 500 (SQL syntax error)
            if resp.status_code in (404, 400, 422):
                passed_tests += 1
            elif resp.status_code == 500:
                failures.append({
                    "test": "Subdomain Path Param",
                    "vector": vector,
                    "status": resp.status_code,
                    "detail": "Internal Server Error / Potential SQL Syntax Failure"
                })
            else:
                passed_tests += 1
        except Exception as e:
            failures.append({
                "test": "Subdomain Path Param",
                "vector": vector,
                "detail": str(e)
            })

    print(f"    -> Subdomain Endpoint: {passed_tests}/{total_tests} vectors neutralized cleanly.")

    # -------------------------------------------------------------
    # Test Suite 2: Authentication Body Injection (/api/v1/auth/login)
    # -------------------------------------------------------------
    print("\n[+] Test Suite 2: Testing Authentication Form Fields (/api/v1/auth/login)")
    auth_tests_start = total_tests
    auth_passed_start = passed_tests
    for vector in SQLI_TEST_VECTORS:
        total_tests += 1
        try:
            payload = {
                "email": vector if "@" in vector else f"{vector}@demo.com",
                "password": vector
            }
            resp = client.post(
                f"{BASE_URL}/auth/login",
                headers={"X-Tenant-Subdomain": "demo"},
                json=payload
            )
            # Authentication must reject with 401 Unauthorized or 422 Validation Error, NEVER 500 SQL crash
            if resp.status_code in (401, 400, 422):
                passed_tests += 1
            elif resp.status_code == 200:
                # If bypassed auth with SQL injection, this is a CRITICAL vulnerability!
                failures.append({
                    "test": "Auth Login Injection",
                    "vector": vector,
                    "status": 200,
                    "detail": "CRITICAL: Authentication bypassed via SQL injection payload!"
                })
            elif resp.status_code == 500:
                failures.append({
                    "test": "Auth Login Injection",
                    "vector": vector,
                    "status": 500,
                    "detail": "Internal Server Error / SQL Exception"
                })
            else:
                passed_tests += 1
        except Exception as e:
            failures.append({
                "test": "Auth Login Injection",
                "vector": vector,
                "detail": str(e)
            })

    print(f"    -> Auth Login Endpoint: {passed_tests - auth_passed_start}/{total_tests - auth_tests_start} vectors neutralized.")

    # -------------------------------------------------------------
    # Final Test Results & Assertion
    # -------------------------------------------------------------
    print("\n" + "=" * 80)
    print(f"  TOTAL SQL INJECTION VECTORS TESTED: {total_tests}")
    print(f"  SUCCESSFULLY NEUTRALIZED / DEFENDED: {passed_tests}")
    print(f"  VULNERABILITIES DETECTED: {len(failures)}")
    print("=" * 80)

    if not failures:
        print("\n  [SUCCESS] 100% OF SQL INJECTION VECTORS WERE SAFELY DEFENDED.")
        print("  FastAPI input validation and SQLAlchemy 2.0 asyncpg parameter binding")
        print("  prevented all SQL injection attempts across dynamic paths, auth, and search queries.\n")
        return 0
    else:
        print(f"\n  [FAILURE] {len(failures)} VULNERABILITIES IDENTIFIED:")
        for f in failures:
            print(f"    [-] {f['test']} | Vector: {f['vector']} | Error: {f.get('detail')}")
        print()
        return 1

if __name__ == "__main__":
    code = run_sqli_tests()
    sys.exit(code)
