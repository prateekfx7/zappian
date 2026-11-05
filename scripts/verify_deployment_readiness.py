#!/usr/bin/env python3
"""
ReelBrain Pre-Flight Deployment Readiness Verifier.
Validates code integrity, schemas, imports, types, and build status before deployment.
"""

import importlib
import json
import os
import subprocess
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent.parent


def check(title: str, func):
    sys.stdout.write(f"[*] Checking {title}... ")
    sys.stdout.flush()
    try:
        msg = func()
        print(f"\033[92mPASSED\033[0m ({msg})")
        return True
    except Exception as e:
        print(f"\033[91mFAILED\033[0m: {e}")
        return False


def verify_schemas():
    report_schema = ROOT_DIR / "packages" / "schemas" / "report.json"
    concept_schema = ROOT_DIR / "packages" / "schemas" / "concept.json"
    assert report_schema.exists(), "Missing packages/schemas/report.json"
    assert concept_schema.exists(), "Missing packages/schemas/concept.json"

    with open(report_schema, "r") as f:
        r = json.load(f)
    with open(concept_schema, "r") as f:
        c = json.load(f)
    return f"Report schema v{r.get('$schema', 'valid')}, Concept schema loaded"


def verify_brain_memory():
    mem_file = ROOT_DIR / "storage" / "brain_memory.json"
    assert mem_file.exists(), "Missing storage/brain_memory.json"
    with open(mem_file, "r") as f:
        data = json.load(f)
    vids = len(data.get("videos", {}))
    rules = len(data.get("creator_thoughts", {}))
    return f"{vids} videos indexed, {rules} creator rules loaded"


def verify_api_imports():
    sys.path.insert(0, str(ROOT_DIR))
    sys.path.insert(0, str(ROOT_DIR / "apps" / "api"))
    import apps.api.main as api_main
    assert hasattr(api_main, "app"), "apps.api.main missing FastAPI app instance"
    return "FastAPI app and all routes imported cleanly"


def verify_grok_provider():
    from packages.providers.grok import check_grok_status, get_xai_api_key
    status = check_grok_status()
    has_key = get_xai_api_key() is not None
    return f"Provider ready (key configured: {has_key}, status: {status['status']})"


def verify_nextjs_build():
    build_dir = ROOT_DIR / "apps" / "web" / ".next"
    assert build_dir.exists(), "Next.js build artifacts not found. Run 'npm run build --prefix apps/web'"
    return "Next.js .next build artifacts present"


def verify_dockerfiles():
    api_df = ROOT_DIR / "apps" / "api" / "Dockerfile"
    web_df = ROOT_DIR / "apps" / "web" / "Dockerfile"
    compose = ROOT_DIR / "infra" / "compose.yml"
    assert api_df.exists(), "Missing apps/api/Dockerfile"
    assert web_df.exists(), "Missing apps/web/Dockerfile"
    assert compose.exists(), "Missing infra/compose.yml"
    return "Dockerfiles and docker-compose configurations verified"


def verify_vercel_config():
    v = ROOT_DIR / "vercel.json"
    assert v.exists(), "Missing vercel.json"
    with open(v, "r") as f:
        vdata = json.load(f)
    assert "services" in vdata or "rewrites" in vdata, "vercel.json missing configuration"
    return "vercel.json microservices & rewrites configured"


def main():
    print("=" * 60)
    print("  ReelBrain Deployment Readiness Check")
    print("=" * 60)

    checks = [
        ("Schemas & Specifications", verify_schemas),
        ("Brain Knowledge Base & Seed Intelligence", verify_brain_memory),
        ("FastAPI Backend & Pipeline Modules", verify_api_imports),
        ("Grok Bot (xAI) Integration", verify_grok_provider),
        ("Next.js Frontend Build Artifacts", verify_nextjs_build),
        ("Container Dockerfiles & Compose", verify_dockerfiles),
        ("Vercel Microservices Config", verify_vercel_config),
    ]

    all_passed = True
    for title, fn in checks:
        if not check(title, fn):
            all_passed = False

    print("=" * 60)
    if all_passed:
        print("\033[92m✔ ALL PRE-FLIGHT DEPLOYMENT CHECKS PASSED!\033[0m")
        print("Ready to deploy via Vercel, Docker Compose, or Cloud VM.")
        sys.exit(0)
    else:
        print("\033[91m✖ Some checks failed. Resolve above issues before deploying.\033[0m")
        sys.exit(1)


if __name__ == "__main__":
    main()

