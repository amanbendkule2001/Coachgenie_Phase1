"""
Security Headers & Production Hardening Automated Test Suite
CoachGenie Enterprise Platform
"""

import sys
import asyncio
from httpx import AsyncClient, ASGITransport
from pathlib import Path

# Add backend directory to sys.path
backend_path = str(Path(__file__).parent / "backend")
if backend_path not in sys.path:
    sys.path.insert(0, backend_path)

from app.main import app

REQUIRED_HEADERS = {
    "strict-transport-security": "max-age=63072000; includeSubDomains; preload",
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "x-xss-protection": "1; mode=block"
}

async def run_asgi_headers_test():
    print("=" * 80)
    print("  COACHGENIE AUTOMATED SECURITY HEADERS TEST SUITE (FASTAPI APP)")
    print("=" * 80)

    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://testserver") as client:
        resp = await client.get("/health")
        headers = {k.lower(): v for k, v in resp.headers.items()}

    print("\n[+] Response Headers Received from App Middleware:")
    for k, v in sorted(headers.items()):
        print(f"    {k}: {v}")

    print("\n[+] Evaluating Security Header Assertions:")
    all_passed = True
    for header, expected_val in REQUIRED_HEADERS.items():
        val = headers.get(header)
        if val and expected_val in val:
            print(f"  [PASS] {header}: {val}")
        else:
            print(f"  [FAIL] {header} missing or incorrect. Expected: '{expected_val}', Got: '{val}'")
            all_passed = False

    print("\n" + "=" * 80)
    if all_passed:
        print("  [SUCCESS] 100% OF SECURITY HEADERS ARE ACTIVE AND ENFORCED.")
        print("  HSTS, X-Content-Type-Options, X-Frame-Options, Referrer-Policy, and XSS Protection verified.")
        print("=" * 80 + "\n")
        return 0
    else:
        print("  [FAILURE] Some required security headers were not returned by the application.")
        print("=" * 80 + "\n")
        return 1

if __name__ == "__main__":
    code = asyncio.run(run_asgi_headers_test())
    sys.exit(code)
