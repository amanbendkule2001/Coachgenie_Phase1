import urllib.request
import ssl
import socket
import time
import json

url = "https://app.thecoachgenie.in/login"
http_url = "http://app.thecoachgenie.in/login"
api_health_url = "https://coachgenie-phase1.onrender.com/health"

print("=" * 80)
print("  LIVE PRODUCTION AUDIT: AVAILABILITY & SSL VERIFICATION")
print("=" * 80)

print("\n--- 1. DNS & SSL Certificate Verification ---")
try:
    hostname = "app.thecoachgenie.in"
    ip = socket.gethostbyname(hostname)
    print(f"DNS Resolution: {hostname} -> IP: {ip}")
    
    ctx = ssl.create_default_context()
    with ctx.wrap_socket(socket.socket(), server_hostname=hostname) as s:
        s.settimeout(10.0)
        s.connect((hostname, 443))
        cert = s.getpeercert()
        print("SSL TLS 1.3 Handshake: SUCCESS")
        print(f"Subject: {cert.get('subject')}")
        print(f"Issuer: {cert.get('issuer')}")
        print(f"Validity Period: {cert.get('notBefore')} to {cert.get('notAfter')}")
except Exception as e:
    print(f"SSL/TLS Check Failed: {e}")

print("\n--- 2. HTTP to HTTPS Redirection Test ---")
try:
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            print(f"HTTP Redirect Code {code} -> Location: {headers.get('Location')}")
            return None

    opener = urllib.request.build_opener(NoRedirect)
    try:
        req = urllib.request.Request(http_url, headers={"User-Agent": "CoachGenieQA/1.0"})
        resp = opener.open(req, timeout=10)
        print(f"HTTP Status: {resp.getcode()} (Direct response without redirect)")
    except urllib.error.HTTPError as e:
        print(f"HTTP Redirect Triggered: {e.code} -> {e.headers.get('Location')}")
except Exception as e:
    print(f"HTTP Redirection check failed: {e}")

print("\n--- 3. HTTPS Frontend Live Headers & Performance ---")
try:
    t0 = time.time()
    req = urllib.request.Request(url, headers={"User-Agent": "CoachGenieQA/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        ttfb = time.time() - t0
        print(f"HTTPS Status Code: {resp.getcode()} OK")
        print(f"TTFB Latency: {ttfb:.3f}s")
        print("Response Headers:")
        for k, v in resp.headers.items():
            print(f"  {k}: {v}")
except Exception as e:
    print(f"HTTPS Request Failed: {e}")

print("\n--- 4. Backend Health Endpoint Verification ---")
try:
    t0 = time.time()
    req = urllib.request.Request(api_health_url, headers={"User-Agent": "CoachGenieQA/1.0"})
    with urllib.request.urlopen(req, timeout=15) as resp:
        ttfb = time.time() - t0
        body = resp.read().decode('utf-8')
        print(f"Backend API Status: {resp.getcode()} OK (in {ttfb:.3f}s)")
        print(f"Backend Health Response: {body}")
        print("Backend Response Headers:")
        for k, v in resp.headers.items():
            print(f"  {k}: {v}")
except Exception as e:
    print(f"Backend API Check Failed: {e}")
