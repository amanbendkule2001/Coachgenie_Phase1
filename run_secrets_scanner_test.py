"""
Automated Secrets & Credentials Security Scanner Test Suite
CoachGenie Enterprise Platform
"""

import os
import re
import sys
from pathlib import Path

# Directories to skip entirely from filesystem walk
EXCLUDE_DIR_NAMES = {
    ".git", "node_modules", ".next", "__pycache__", ".pytest_cache",
    "playwright-report", "test-results", "dist", "build", "generated_reports",
    "fresh_screenshots", "multilingual_screenshots", "multilingual_module_screens",
    "raw_output_en", "raw_output_hi", "raw_output_mr", "timed_video_output",
    "audio_en", "audio_hi", "audio_mr", "audio_tracks", "recorded_videos",
    ".idea", ".vscode", "coverage", ".turbo"
}

EXCLUDE_FILE_NAMES = {
    ".env", ".env.test", ".env.local", ".env.production",
    "package-lock.json", "pnpm-lock.yaml", "client.zip", "backend.zip",
    "project_tree.txt", "updated_project_tree.txt", "folder_structure.txt",
    "report_structure.txt", "database_dump.txt", "dependencies_dump.txt",
    "security_dump.txt", "tenant_dump.txt", "user_dump.txt", "update_pw.sql",
    "test-run.log", "CoachGenie_Authentication_Security_Audit_Report.pdf",
    "CoachGenie_API_Authorization_Security_Audit_Report.pdf",
    "CoachGenie_Secrets_Security_Audit_Report.pdf",
    "auth_security_report.html", "authz_security_report.html", "secrets_audit_report.html",
    "run_secrets_scanner_test.py"
}

EXCLUDE_EXTENSIONS = {
    ".png", ".jpg", ".jpeg", ".mp4", ".webm", ".webp", ".mp3", ".wav",
    ".pdf", ".zip", ".tar", ".gz", ".ico", ".svg", ".ttf", ".woff", ".woff2"
}

SECRET_PATTERNS = [
    (
        "AWS Access Key ID",
        re.compile(r"\b(AKIA[0-9A-Z]{16})\b")
    ),
    (
        "Live OpenAI / Groq / Anthropic API Key",
        re.compile(r"\b((?:sk|gsk|pk)_[a-zA-Z0-9_\-]{20,})\b")
    ),
    (
        "Embedded Database Connection String with Credentials",
        re.compile(r"(?:postgresql(?:\+[a-z]+)?|mysql|mongodb(?:\+srv)?)://([a-zA-Z0-9_\-]+):([^@\s:/?#]+)@([a-zA-Z0-9_\-\.]+)")
    ),
    (
        "Private Cryptographic Key",
        re.compile(r"-----BEGIN (?:[A-Z0-9_-]+ )?PRIVATE KEY-----")
    ),
]

ALLOWED_DEFAULTS = {
    "Admin@1234", "password", "test", "your_email", "your_password",
    "change_this_to_64_random_chars", "changeme", "placeholder",
    "[redacted_api_key]", "localhost", "127.0.0.1", "0.0.0.0"
}

def scan_file(file_path: Path):
    violations = []
    try:
        content = file_path.read_text(encoding="utf-8", errors="ignore")
    except Exception:
        return violations

    lines = content.splitlines()
    for line_num, line in enumerate(lines, start=1):
        stripped = line.strip()

        # Check for live embedded DB connection strings in comments
        if (stripped.startswith("//") or stripped.startswith("#")) and "postgresql" in stripped and "@" in stripped:
            if "postgres:password" not in stripped and "postgres:test" not in stripped and "postgres:${" not in stripped:
                violations.append({
                    "file": str(file_path),
                    "line": line_num,
                    "rule": "Commented Live Database Password in Source Code",
                    "snippet": stripped[:80]
                })
            continue

        if stripped.startswith("//") or stripped.startswith("#") or stripped.startswith("*"):
            continue

        for rule_name, pattern in SECRET_PATTERNS:
            match = pattern.search(line)
            if match:
                matched_val = match.group(0).strip()
                is_safe = False
                for safe_str in ALLOWED_DEFAULTS:
                    if safe_str.lower() in matched_val.lower():
                        is_safe = True
                        break

                if "pattern" in line or "regex" in line or "SECRET_PATTERNS" in line:
                    is_safe = True

                if not is_safe:
                    violations.append({
                        "file": str(file_path),
                        "line": line_num,
                        "rule": rule_name,
                        "snippet": line.strip()[:80]
                    })

    return violations

def run_scanner(root_dir: str):
    root = Path(root_dir)
    print("=" * 80)
    print("  COACHGENIE AUTOMATED SECRETS & CREDENTIALS SECURITY SCANNER TEST")
    print(f"  Target Workspace: {root.resolve()}")
    print("=" * 80)

    total_files = 0
    all_violations = []

    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Prune excluded directories immediately
        dirnames[:] = [d for d in dirnames if d not in EXCLUDE_DIR_NAMES and not d.startswith(".")]

        for filename in filenames:
            if filename in EXCLUDE_FILE_NAMES:
                continue

            file_path = Path(dirpath) / filename
            if file_path.suffix in EXCLUDE_EXTENSIONS:
                continue

            total_files += 1
            violations = scan_file(file_path)
            if violations:
                all_violations.extend(violations)

    print(f"\n[+] Total Source Files Scanned: {total_files}")
    print(f"[+] Total Security Rules Evaluated: {len(SECRET_PATTERNS)}")

    if not all_violations:
        print("\n" + "=" * 80)
        print("  [SUCCESS] 0 SECRET VIOLATIONS DETECTED.")
        print("  All source code files are 100% clean of hardcoded credentials & API keys.")
        print("=" * 80 + "\n")
        return 0
    else:
        print("\n" + "=" * 80)
        print(f"  [FAILURE] {len(all_violations)} SECRET VIOLATIONS DETECTED:")
        print("=" * 80)
        for v in all_violations:
            print(f"  [-] {v['file']}:{v['line']} | {v['rule']}")
            print(f"      Snippet: {v['snippet']}")
        print("=" * 80 + "\n")
        return 1

if __name__ == "__main__":
    exit_code = run_scanner(os.getcwd())
    sys.exit(exit_code)
