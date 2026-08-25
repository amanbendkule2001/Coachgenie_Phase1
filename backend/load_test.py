"""
CoachGenie Local Load & Stress Testing Script
Simulates concurrent user traffic against local backend (http://127.0.0.1:8000).

Usage:
    python load_test.py --users 50 --duration 10
    python load_test.py --users 100 --duration 15
    python load_test.py --users 250 --duration 20
"""

import argparse
import asyncio
import time
import statistics
import httpx

import os

BASE_URL = os.getenv("LOADTEST_BASE_URL", "http://127.0.0.1:8000/api/v1")
TENANT = os.getenv("LOADTEST_TENANT", "demo")
EMAIL = os.getenv("LOADTEST_EMAIL", "owner@demo.com")
PASSWORD = os.getenv("LOADTEST_PASSWORD", "Admin@1234")

ENDPOINTS = [
    "/dashboard/owner",
    "/students/",
    "/leads/",
    "/admissions/",
    "/fees/invoices",
    "/batches/",
]

async def get_auth_token():
    async with httpx.AsyncClient() as client:
        try:
            resp = await client.post(
                f"{BASE_URL}/auth/login",
                headers={"X-Tenant-Subdomain": TENANT},
                json={"email": EMAIL, "password": PASSWORD},
                timeout=10.0,
            )
            if resp.status_code == 200:
                data = resp.json()
                return data.get("access_token")
            else:
                print(f"[!] Auth failed ({resp.status_code}): {resp.text}")
                return None
        except Exception as e:
            print(f"[!] Auth connection error: {e}")
            return None

async def worker(worker_id: int, token: str, stop_time: float, latencies: list, results: list):
    headers = {
        "X-Tenant-Subdomain": TENANT,
        "Authorization": f"Bearer {token}",
    }
    async with httpx.AsyncClient(headers=headers, timeout=10.0) as client:
        idx = worker_id % len(ENDPOINTS)
        endpoint = ENDPOINTS[idx]
        url = f"{BASE_URL}{endpoint}"
        
        while time.time() < stop_time:
            t0 = time.perf_counter()
            try:
                resp = await client.get(url)
                dt = (time.perf_counter() - t0) * 1000.0  # ms
                latencies.append(dt)
                if resp.status_code < 400:
                    results.append("SUCCESS")
                else:
                    results.append(f"HTTP_{resp.status_code}")
            except Exception as e:
                results.append("ERROR")
            await asyncio.sleep(0.01)  # small yield

async def run_load_test(users: int, duration: int):
    print(f"\n==================================================")
    print(f"  COACHGENIE LOCAL LOAD TEST")
    print(f" Target: {BASE_URL}")
    print(f" Virtual Users: {users} concurrent")
    print(f" Test Duration: {duration} seconds")
    print(f"==================================================\n")

    print("[1/3] Authenticating test user...")
    token = await get_auth_token()
    if not token:
        print("[!] Could not obtain auth token. Ensure backend server is running on http://127.0.0.1:8000")
        return

    print(f"[2/3] Spawning {users} concurrent virtual users...")
    latencies = []
    results = []
    stop_time = time.time() + duration

    tasks = [
        asyncio.create_task(worker(i, token, stop_time, latencies, results))
        for i in range(users)
    ]

    t_start = time.perf_counter()
    await asyncio.gather(*tasks)
    total_time = time.perf_counter() - t_start

    print("[3/3] Calculating benchmark results...\n")

    total_requests = len(results)
    successes = results.count("SUCCESS")
    errors = total_requests - successes
    rps = total_requests / total_time if total_time > 0 else 0

    if latencies:
        latencies.sort()
        p50 = statistics.median(latencies)
        p95 = latencies[int(len(latencies) * 0.95)]
        p99 = latencies[int(len(latencies) * 0.99)]
        avg = statistics.mean(latencies)
    else:
        p50 = p95 = p99 = avg = 0

    print("==================================================")
    print("  LOAD TEST RESULTS SUMMARY")
    print("==================================================")
    print(f" Total Duration      : {total_time:.2f} seconds")
    print(f" Concurrent Users    : {users}")
    print(f" Total Requests      : {total_requests}")
    print(f" Successful Requests : {successes} ({successes/max(1, total_requests)*100:.1f}%)")
    print(f" Failed Requests     : {errors}")
    print(f" Throughput (RPS)    : {rps:.2f} req/sec")
    print("--------------------------------------------------")
    print("  RESPONSE LATENCY (ms)")
    print(f" Average Latency     : {avg:.2f} ms")
    print(f" Median (p50)        : {p50:.2f} ms")
    print(f" 95th Percentile(p95): {p95:.2f} ms")
    print(f" 99th Percentile(p99): {p99:.2f} ms")
    print("==================================================\n")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="CoachGenie Local Load Test")
    parser.add_argument("--users", type=int, default=50, help="Number of concurrent virtual users")
    parser.add_argument("--duration", type=int, default=10, help="Test duration in seconds")
    args = parser.parse_args()

    asyncio.run(run_load_test(args.users, args.duration))
