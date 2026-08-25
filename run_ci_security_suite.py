"""
CoachGenie Enterprise CI/CD Unified Security Test Harness
Runs all 5 automated security verification suites and reports aggregated status.
"""

import sys
import subprocess
import time

TEST_SUITES = [
    {
        "name": "1. Secrets & Credentials Scanner",
        "script": "run_secrets_scanner_test.py",
        "description": "Scans 800+ source files for API keys, passwords, and private tokens."
    },
    {
        "name": "2. SQL Injection Attack Vector Defense",
        "script": "test_sql_injection_defense.py",
        "description": "Simulates 28 SQL injection vectors against auth and public endpoints."
    },
    {
        "name": "3. HTTP Security Headers & HSTS Compliance",
        "script": "test_security_headers.py",
        "description": "Validates HSTS, CSP, X-Frame-Options, X-Content-Type-Options, and Referrer-Policy."
    },
    {
        "name": "4. Software Supply Chain & Dependency Health",
        "script": "test_dependency_verification.py",
        "description": "Audits 6 project manifests for typosquatting, unmaintained packages, and known CVEs."
    },
    {
        "name": "5. Error Handling & Information Leakage Shield",
        "script": "test_error_handling_defense.py",
        "description": "Verifies database schema shielding, consistent JSON error formats, and custom error pages."
    }
]

def run_ci_security_pipeline():
    start_time = time.time()
    print("=" * 85, flush=True)
    print("      COACHGENIE ENTERPRISE CI/CD UNIFIED SECURITY PIPELINE", flush=True)
    print("=" * 85, flush=True)

    passed_count = 0
    failed_count = 0
    results = []

    for suite in TEST_SUITES:
        print(f"\n[+] Running Suite: {suite['name']}", flush=True)
        print(f"    Target: {suite['script']} — {suite['description']}", flush=True)
        
        t0 = time.time()
        try:
            res = subprocess.run(
                [sys.executable, suite["script"]],
                capture_output=True,
                text=True,
                timeout=45
            )
            elapsed = time.time() - t0
            if res.returncode == 0:
                print(f"    [PASSED] in {elapsed:.2f}s (Exit Code 0)", flush=True)
                passed_count += 1
                results.append({"name": suite["name"], "status": "PASSED", "time": f"{elapsed:.2f}s"})
            else:
                print(f"    [FAILED] in {elapsed:.2f}s (Exit Code {res.returncode})", flush=True)
                print("    --- Stderr / Stdout Snippet ---", flush=True)
                output = res.stderr or res.stdout
                for line in output.strip().splitlines()[-6:]:
                    print(f"      {line}", flush=True)
                failed_count += 1
                results.append({"name": suite["name"], "status": "FAILED", "time": f"{elapsed:.2f}s"})
        except Exception as e:
            elapsed = time.time() - t0
            print(f"    [ERROR] Execution failed: {e}", flush=True)
            failed_count += 1
            results.append({"name": suite["name"], "status": "ERROR", "time": f"{elapsed:.2f}s"})

    total_time = time.time() - start_time
    print("\n" + "=" * 85, flush=True)
    print("                         PIPELINE EXECUTION SUMMARY", flush=True)
    print("=" * 85, flush=True)
    for r in results:
        status_badge = "[ PASS ]" if r["status"] == "PASSED" else "[ FAIL ]"
        print(f"  {status_badge} {r['name']:<55} | Duration: {r['time']}")

    print("-" * 85)
    print(f"  Total Suites Run: {len(TEST_SUITES)} | Passed: {passed_count} | Failed: {failed_count} | Total Time: {total_time:.2f}s")
    print("=" * 85)

    if failed_count == 0:
        print("\n  [SUCCESS] 100% CI/CD SECURITY GATES PASSED. DEPLOYMENT APPROVED.")
        return 0
    else:
        print(f"\n  [BLOCKED] {failed_count} SECURITY SUITES FAILED. DEPLOYMENT REJECTED.")
        return 1

if __name__ == "__main__":
    code = run_ci_security_pipeline()
    sys.exit(code)
