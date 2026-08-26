import urllib.request
import json
import ssl

backend_url = "https://coachgenie-phase1.onrender.com"

print("=" * 80)
print("  LIVE BACKEND & CORS SECURITY AUDIT")
print(f"  Target: {backend_url}")
print("=" * 80)

# 1. Test CORS with allowed origin
print("\n[+] 1. Testing CORS with Valid Production Origin (https://app.thecoachgenie.in):")
try:
    req = urllib.request.Request(
        f"{backend_url}/api/v1/tenants/demo",
        headers={
            "Origin": "https://app.thecoachgenie.in",
            "User-Agent": "CoachGenieSecurityAudit/1.0"
        }
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        print(f"    Status: {resp.getcode()} OK")
        print(f"    Access-Control-Allow-Origin: {resp.headers.get('Access-Control-Allow-Origin')}")
        print(f"    Access-Control-Allow-Credentials: {resp.headers.get('Access-Control-Allow-Credentials')}")
except Exception as e:
    print(f"    Request failed or timed out: {e}")

# 2. Test CORS with unauthorized origin
print("\n[+] 2. Testing CORS with Unauthorized Malicious Origin (https://attacker.evil.com):")
try:
    req = urllib.request.Request(
        f"{backend_url}/api/v1/tenants/demo",
        headers={
            "Origin": "https://attacker.evil.com",
            "User-Agent": "CoachGenieSecurityAudit/1.0"
        }
    )
    with urllib.request.urlopen(req, timeout=15) as resp:
        print(f"    Status: {resp.getcode()} OK")
        allow_origin = resp.headers.get('Access-Control-Allow-Origin')
        print(f"    Access-Control-Allow-Origin: {allow_origin}")
        if allow_origin == "https://attacker.evil.com" or allow_origin == "*":
            print("    [!] WARNING: Wildcard or attacker origin reflected in CORS!")
        else:
            print("    [PASS] Malicious origin rejected by CORS policy.")
except Exception as e:
    print(f"    Request status: {e}")

print("\n" + "=" * 80)
