#!/usr/bin/env bash
# ==============================================================================
# ReelBrain - One-Click Deployment Script
# ==============================================================================
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

echo "============================================================"
echo "  🚀 ReelBrain Deployment Engine"
echo "============================================================"

# Step 1: Pre-flight checks
echo "[1/3] Running pre-flight checks..."
if [ -d ".venv" ]; then
    .venv/bin/python scripts/verify_deployment_readiness.py
else
    python3 scripts/verify_deployment_readiness.py
fi

# Step 2: Choose target
TARGET="${1:-vercel}"

echo ""
echo "[2/3] Preparing deployment for target: $TARGET"

case "$TARGET" in
  vercel)
    echo "Deploying to Vercel (Next.js web + FastAPI microservice)..."
    if ! command -v vercel &> /dev/null; then
        echo "Vercel CLI not found in PATH. You can install it with: npm i -g vercel"
        echo "Or deploy by pushing to your connected GitHub repository."
        exit 0
    fi
    vercel --prod
    ;;

  docker|compose)
    echo "Building and launching Docker Compose cluster..."
    if ! command -v docker &> /dev/null; then
        echo "Error: docker command not found."
        exit 1
    fi
    docker compose -f docker-compose.yml up -d --build
    echo "Services running. Check status with: docker compose ps"
    ;;

  build-only)
    echo "Building production frontend assets..."
    npm run build --prefix apps/web
    echo "Frontend build complete."
    ;;

  *)
    echo "Unknown deployment target: $TARGET"
    echo "Usage: ./deploy.sh [vercel | docker | build-only]"
    exit 1
    ;;
esac

echo ""
echo "[3/3] Deployment sequence complete."
echo "============================================================"

