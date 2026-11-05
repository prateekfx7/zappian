# Deployment Guide — ReelBrain

This guide details how to deploy ReelBrain to production across supported hosting targets.

---

## 1. Quick Verification (Pre-Flight)

Before deploying, run the automated readiness check to verify schemas, builds, typing, and seed data:

```bash
./deploy.sh build-only
# or
python3 scripts/verify_deployment_readiness.py
```

---

## 2. Deployment Targets

### Option A: Vercel (Recommended for Web + Serverless API)

ReelBrain includes a native multi-service [`vercel.json`](../vercel.json) configuration:
- **`web`**: Next.js 14 frontend (`apps/web`).
- **`api`**: FastAPI backend (`apps/api`).
- **Rewrites**: All `/v1/*`, `/health`, and `/storage/*` requests automatically proxy to the FastAPI service.

#### Deploy via GitHub (Zero Config):
1. Push your repository to GitHub.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Environment Variables in your Vercel Project Settings:
   - `XAI_API_KEY`: `xai-...`
   - `SECRET_KEY`: `your-random-32-char-secret`
   - (Optional) `NEXT_PUBLIC_API_URL`: Leave blank if deploying frontend + API together on Vercel, as requests route via same-origin `/v1/...`.

#### Deploy via Vercel CLI:
```bash
npm install -g vercel
./deploy.sh vercel
```

---

### Option B: Docker Compose (Single VM / VPS / RunPod)

Deploy the complete container stack (PostgreSQL + pgvector, Redis, MinIO, FastAPI API, Next.js Web):

```bash
# 1. Copy the production environment template
cp .env.production.example .env

# 2. Fill in your secrets and API keys in .env:
#    - XAI_API_KEY
#    - POSTGRES_PASSWORD
#    - SECRET_KEY

# 3. Launch with Docker Compose
docker compose up -d --build

# 4. Check status
docker compose ps
```

Services exposed:
- **Web Frontend**: `http://<your-server-ip>:3000`
- **FastAPI API**: `http://<your-server-ip>:8000`
- **MinIO S3 Console**: `http://<your-server-ip>:9001`

---

### Option C: Railway / Render (Container / PaaS)

1. Connect your repository to Railway or Render.
2. Deploy the two services:
   - **Frontend (`apps/web`)**:
     - Root directory: `apps/web`
     - Build command: `npm run build`
     - Start command: `npm run start`
     - Env: `NEXT_PUBLIC_API_URL=https://<your-api-domain>`
   - **Backend (`apps/api`)**:
     - Dockerfile: `apps/api/Dockerfile`
     - Context: Root (`.`)
     - Port: `8000`
     - Env: `XAI_API_KEY`, `POSTGRES_HOST`, `REDIS_HOST`, etc.

---

## 3. Environment Variables Reference

| Variable | Required | Default / Example | Purpose |
|---|---|---|---|
| `XAI_API_KEY` | Recommended | `xai-...` | Enables Grok Bot chat, video hook critiques & script generation |
| `NEXT_PUBLIC_API_URL` | Optional | `""` (relative on Vercel) / `http://localhost:8001` | Base URL used by browser client to talk to the API |
| `SECRET_KEY` | Yes (Prod) | 32+ character random string | Signs session tokens and cookies |
| `CORS_ORIGINS` | Optional | `http://localhost:3000,https://your-domain.com` | Allowed CORS origins for browser API calls |
| `DATABASE_URL` | Optional | `postgresql+asyncpg://...` | Connection to PostgreSQL + pgvector |
| `REDIS_URL` | Optional | `redis://localhost:6379/0` | Cache and task queue connection |
| `STORAGE_ENDPOINT` | Optional | `minio:9000` | S3 or MinIO object storage endpoint |

---

## 4. Post-Deployment Smoke Test

Once deployed, verify your deployment:

```bash
# 1. Health check
curl -f https://<your-domain>/health

# 2. Grok Bot check
curl -f https://<your-domain>/v1/grok/status

# 3. Brain summary check
curl -f https://<your-domain>/v1/brain
```

