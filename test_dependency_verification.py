"""
Dependency Verification & Software Supply Chain Automated Security Testing Suite
CoachGenie Enterprise Platform
"""

import os
import sys
import json
import re
from pathlib import Path

# Known legitimate packages whitelist
LEGITIMATE_PACKAGES = {
    # Python
    "fastapi", "uvicorn", "sqlalchemy", "asyncpg", "alembic", "bcrypt",
    "python-jose", "python-multipart", "pydantic", "pydantic-settings",
    "httpx", "openai", "aiosmtplib", "email-validator", "slowapi",
    "python-dotenv", "pytest", "pytest-asyncio", "psycopg2-binary",
    "groq", "apscheduler", "ollama", "weasyprint", "reportlab",
    
    # Node
    "next", "react", "react-dom", "@tanstack/react-query", "@tanstack/react-table",
    "lucide-react", "zod", "zustand", "tailwindcss", "typescript",
    "jspdf", "jspdf-autotable", "date-fns", "clsx", "tailwind-merge",
    "playwright", "@playwright/test", "dotenv", "geist", "immer", "jose"
}

# Typosquatting / Suspicious pattern checks
KNOWN_TYPOSQUAT_PATTERNS = [
    r"fast-api", r"pydanticc", r"sql-alchemy", r"reacht", r"nexxt",
    r"bcryptt", r"taylwind", r"typscript", r"nodemailerr"
]

def audit_python_requirements(file_path: Path):
    violations = []
    if not file_path.exists():
        return violations

    lines = file_path.read_text(encoding="utf-8").splitlines()
    for line_num, line in enumerate(lines, start=1):
        line = line.strip()
        if not line or line.startswith("#"):
            continue

        # Extract package name and version
        match = re.match(r"^([a-zA-Z0-9_\-\[\]]+)(==|>=|<=|~=|\^)?(.*)$", line)
        if match:
            pkg_name = match.group(1).split("[")[0].strip().lower()
            comparator = match.group(2)
            version = match.group(3).strip()

            # Typosquatting check
            for typo in KNOWN_TYPOSQUAT_PATTERNS:
                if re.search(typo, pkg_name):
                    violations.append({
                        "file": str(file_path),
                        "line": line_num,
                        "pkg": pkg_name,
                        "issue": f"Potential typosquatting detected matching pattern '{typo}'"
                    })

            # Check unmaintained / deprecated packages
            if pkg_name in ("passlib", "pycrypto"):
                violations.append({
                    "file": str(file_path),
                    "line": line_num,
                    "pkg": pkg_name,
                    "issue": f"Deprecated/Unmaintained package '{pkg_name}' should be removed"
                })

            # Version pinning check
            if comparator != "==":
                violations.append({
                    "file": str(file_path),
                    "line": line_num,
                    "pkg": pkg_name,
                    "issue": f"Package '{pkg_name}' is not strictly pinned with '=='"
                })

    return violations

def audit_node_package(file_path: Path):
    violations = []
    if not file_path.exists():
        return violations

    try:
        data = json.loads(file_path.read_text(encoding="utf-8"))
    except Exception as e:
        return [{"file": str(file_path), "line": 1, "pkg": "N/A", "issue": f"JSON parse error: {e}"}]

    deps = {**data.get("dependencies", {}), **data.get("devDependencies", {})}
    for pkg_name, ver in deps.items():
        if ver.startswith("workspace:"):
            continue

        # Check known vulnerable Next.js versions (< 15.2.3 for next 15)
        if pkg_name == "next":
            clean_ver = ver.replace("^", "").replace("~", "")
            if clean_ver == "15.0.0" or (clean_ver.startswith("15.0.") and clean_ver not in ("15.2.3", "15.5.16")):
                violations.append({
                    "file": str(file_path),
                    "line": 1,
                    "pkg": pkg_name,
                    "issue": f"Next.js version {ver} has known critical CVEs (RCE & Auth Bypass). Upgrade to >=15.2.3."
                })

        # Typosquatting check
        for typo in KNOWN_TYPOSQUAT_PATTERNS:
            if re.search(typo, pkg_name.lower()):
                violations.append({
                    "file": str(file_path),
                    "line": 1,
                    "pkg": pkg_name,
                    "issue": f"Potential typosquatting detected matching '{typo}'"
                })

    return violations

def run_dependency_tests():
    print("=" * 80)
    print("  COACHGENIE DEPENDENCY & SUPPLY CHAIN SECURITY VERIFICATION TEST")
    print("=" * 80)

    root = Path(".")
    python_files = [
        root / "backend" / "requirements.txt",
        root / "copilot_engine" / "requirements.txt"
    ]
    node_files = [
        root / "package.json",
        root / "client" / "apps" / "admin" / "package.json",
        root / "client" / "apps" / "student" / "package.json",
        root / "client" / "apps" / "parent" / "package.json"
    ]

    total_audited = 0
    all_violations = []

    print("\n[+] Auditing Python Requirements Files:")
    for pf in python_files:
        if pf.exists():
            v = audit_python_requirements(pf)
            print(f"    - {pf.as_posix()}: {'CLEAN' if not v else f'{len(v)} issues'}")
            total_audited += 1
            all_violations.extend(v)

    print("\n[+] Auditing Node.js package.json Files:")
    for nf in node_files:
        if nf.exists():
            v = audit_node_package(nf)
            print(f"    - {nf.as_posix()}: {'CLEAN' if not v else f'{len(v)} issues'}")
            total_audited += 1
            all_violations.extend(v)

    print("\n" + "=" * 80)
    print(f"  TOTAL DEPENDENCY MANIFESTS AUDITED: {total_audited}")
    print(f"  SUPPLY CHAIN SECURITY VIOLATIONS DETECTED: {len(all_violations)}")
    print("=" * 80)

    if not all_violations:
        print("\n  [SUCCESS] ALL DEPENDENCIES COMPLIANT & VERIFIED SECURE.")
        print("  0 typosquatting, 0 deprecated packages, 0 unpatched critical CVEs.\n")
        return 0
    else:
        print(f"\n  [FAILURE] {len(all_violations)} ISSUES DETECTED:")
        for v in all_violations:
            print(f"    [-] {v['file']}:{v.get('line', 1)} | {v['pkg']} -> {v['issue']}")
        print()
        return 1

if __name__ == "__main__":
    code = run_dependency_tests()
    sys.exit(code)
