# architecture.md — FrameDNA (working title)

Open-source-first. Everything runs through Docker Compose locally and on a single rented GPU box in production (v1). Model names below are defaults; they live in config, never in business logic.

---

## 1. System overview

```
                         ┌──────────────────────────┐
  Browser (Next.js) ───► │  API Gateway (FastAPI)   │ ◄── Auth (JWT/OAuth)
                         └───────────┬──────────────┘
                                     │ enqueue job
                         ┌───────────▼──────────────┐
                         │ Redis (queue + pubsub)   │
                         └───────────┬──────────────┘
          ┌──────────────┬───────────┼────────────┬───────────────┐
          ▼              ▼           ▼            ▼               ▼
   ingest-worker   media-worker  analysis-worker  remix-worker  gen-worker (GPU)
   (yt-dlp, val.)  (FFmpeg,      (Qwen3-VL,       (text LLM,    (LTX-2 / Wan 2.2
                   PySceneDetect, Whisper, OCR,   originality     via diffusers/
                   librosa)       scoring)         check)         ComfyUI)
          │              │           │            │               │
          └──────────────┴───────────┴────────────┴───────────────┘
                                     │
                  ┌──────────────────┼──────────────────┐
                  ▼                  ▼                  ▼
          Postgres + pgvector   Object storage       Model servers
          (data, embeddings)    (MinIO / S3 / R2)    (vLLM / Ollama)
```

## 2. Tech stack

| Layer | Choice | Notes |
|---|---|---|
| Frontend | Next.js (TypeScript), Tailwind, shadcn/ui | Timeline viewer, report pages, chat-style remix form |
| API | FastAPI (Python 3.11+), Pydantic v2 | One language for API and workers |
| Queue | Redis + Celery (or RQ/Arq) | Stage-based jobs, retries, progress events |
| DB | PostgreSQL 16 + pgvector | Metadata, reports, embeddings |
| Object storage | MinIO (dev/self-host), S3/R2 (cloud) | Videos, frames, outputs |
| Auth | Supabase Auth (self-hostable) or Keycloak/Authlib | JWT sessions |
| Video understanding | **Qwen3-VL** (default), alt: InternVL, Molmo 2 | Served via vLLM; Apache-2.0 for Qwen |
| Text LLM (concepts, scripts, judge) | Qwen3 instruct or Llama family | Served via vLLM/Ollama |
| Speech-to-text | faster-whisper | Word timestamps |
| OCR | PaddleOCR | On keyframes |
| Embeddings | open_clip / SigLIP (image), bge/e5 (text) | pgvector |
| Audio features | librosa | Beats, energy, silence |
| Scene detection | PySceneDetect | Cuts + keyframes |
| Download | yt-dlp | Best effort |
| Video generation | LTX-2 / Wan 2.2 (drafts), HunyuanVideo 1.5 (quality) | Behind `VideoGenProvider` |
| TTS | Kokoro / XTTS / Piper | Behind `TTSProvider` |
| Assembly | FFmpeg + MoviePy | Captions, music, mux |
| Deployment | Docker Compose (v1), then Kubernetes/Nomad if needed | GPU via NVIDIA container toolkit |
| Observability | OpenTelemetry, Prometheus, Grafana, Sentry | Per-stage timings and cost |

Single non-open dependency: YouTube Data API v3 (optional; yt-dlp metadata is the fallback).

## 3. Repository layout

```
framedna/
├─ apps/
│  ├─ web/                  # Next.js frontend
│  └─ api/                  # FastAPI app (routers, schemas, auth)
├─ workers/
│  ├─ ingest/               # validation, yt-dlp, rights flag
│  ├─ media/                # ffmpeg frames, scenes, audio features
│  ├─ analysis/             # vlm, whisper, ocr, scoring, blueprint
│  ├─ remix/                # concept gen, style lock, originality check
│  └─ generation/           # video gen providers, tts, assembly
├─ packages/
│  ├─ schemas/              # JSON Schemas shared by api/workers/web
│  ├─ prompts/              # versioned prompt files (.md/.jinja)
│  └─ providers/            # interfaces + implementations (vlm, llm, videogen, tts, stats)
├─ infra/
│  ├─ docker/               # Dockerfiles per service
│  ├─ compose.yml
│  └─ migrations/           # SQL migrations (Alembic)
├─ docs/                    # PRD.md, architecture.md, rules.md, phases.md, memory.md
└─ tests/                   # unit, integration, golden-video tests
```

## 4. Pipeline (job stages)

Each stage is its own Celery task, writes its result to DB/storage, and emits a progress event. A job is resumable from the last completed stage.

| # | Stage | Input | Output | Tools |
|---|---|---|---|---|
| 0 | `ingest` | file or URL | `videos` row, stored original, probe metadata | yt-dlp, ffprobe |
| 1 | `normalize` | original | 720p H.264 proxy, extracted audio WAV | FFmpeg |
| 2 | `frames` | proxy | 1 fps frames + scene-cut keyframes + thumbnails | FFmpeg, PySceneDetect |
| 3 | `transcribe` | audio | words with timestamps | faster-whisper |
| 4 | `ocr` | keyframes | on-screen text with timestamps | PaddleOCR |
| 5 | `audio_features` | audio | beats, energy curve, silence gaps, WPM | librosa |
| 6 | `embed` | frames | image embeddings → pgvector | open_clip |
| 7 | `vlm_segments` | proxy chunks + frames + transcript + OCR | per-segment analysis JSON | Qwen3-VL via vLLM |
| 8 | `synthesize` | all of the above | blueprint, scores, why-it-works, fixes | text LLM + rules |
| 9 | `stats` | URL / manual | `stats` rows with source labels | yt-dlp / YouTube API |
| 10 | `validate` | report JSON | schema + evidence validation; reject/repair | Pydantic/JSON Schema |
| 11 | `report_ready` | validated report | status=done, notify client | — |

Remix pipeline: `concept` → `styleLock` → `shotPrompts` → `originality_check` → (`generate` → `tts` → `assemble` → `export`).

### Chunking rule for the video model
Video models have length/context limits. Split the proxy into overlapping chunks of ≤ 45 s with 5 s overlap. Pass for each chunk: sampled frames with timestamps, the transcript slice, OCR slice. Merge segment outputs by timestamp, dropping duplicates in overlaps.

## 5. Data model (PostgreSQL)

```sql
create extension if not exists vector;

create table users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  created_at timestamptz default now()
);

create table videos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  source_type text check (source_type in ('upload','youtube','instagram','tiktok','other')),
  source_url text,
  rights_confirmed boolean not null default false,
  storage_key text not null,
  proxy_key text,
  duration_s numeric,
  width int, height int, fps numeric,
  status text not null default 'queued',          -- queued|processing|done|failed
  stage text,
  error text,
  created_at timestamptz default now(),
  expires_at timestamptz
);

create table frames (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id) on delete cascade,
  t_ms int not null,
  is_keyframe boolean default false,
  storage_key text not null,
  ocr_text text,
  embedding vector(768)
);
create index on frames using hnsw (embedding vector_cosine_ops);

create table transcripts (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id) on delete cascade,
  words jsonb not null,            -- [{w, start_ms, end_ms}]
  language text
);

create table analyses (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id) on delete cascade,
  schema_version text not null,
  model_versions jsonb not null,   -- {vlm, llm, whisper}
  segments jsonb not null,         -- per-segment vlm output
  blueprint jsonb not null,
  scores jsonb not null,
  why_it_works jsonb not null,     -- claims with evidence + confidence
  fixes jsonb not null,
  created_at timestamptz default now()
);

create table stats (
  id uuid primary key default gen_random_uuid(),
  video_id uuid references videos(id) on delete cascade,
  metric text not null,            -- views, likes, comments, shares, saves, spend, sales
  value numeric not null,
  source text not null check (source in ('youtube_api','ytdlp','manual','csv','connector')),
  fetched_at timestamptz default now()
);

create table concepts (
  id uuid primary key default gen_random_uuid(),
  analysis_id uuid references analyses(id) on delete cascade,
  brief jsonb not null,            -- product, audience, platform, goal, style
  output jsonb not null,           -- hooks, script, shots, style_lock
  originality jsonb,               -- scores + pass/fail
  created_at timestamptz default now()
);

create table generations (
  id uuid primary key default gen_random_uuid(),
  concept_id uuid references concepts(id) on delete cascade,
  provider text not null,
  shot_index int,
  prompt text not null,
  status text default 'queued',
  output_key text,
  cost_credits numeric,
  created_at timestamptz default now()
);

create table credits_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references users(id) on delete cascade,
  delta numeric not null,
  reason text not null,
  ref_id uuid,
  created_at timestamptz default now()
);
```

## 6. Core JSON contracts

### 6.1 VLM segment output (per segment)
```json
{
  "segment": {"t_start_ms": 0, "t_end_ms": 0},
  "frames": [
    {
      "t_ms": 0,
      "what_is_on_screen": "",
      "subject": "",
      "shot_type": "extreme_close|close|medium|wide|screen_recording|text_card",
      "camera_motion": "static|push_in|pull_out|whip_pan|handheld|tracking|zoom",
      "on_screen_text": "",
      "spoken_text": "",
      "role": "hook|problem|proof|demo|offer|social_proof|cta|transition|other",
      "viewer_emotion": "",
      "why_it_works": "",
      "confidence": "high|medium|low"
    }
  ]
}
```

### 6.2 Final report (abridged)
```json
{
  "schema_version": "1.0",
  "verdict": "",
  "scores": {"hook":0,"retention":0,"emotion":0,"clarity":0,"cta":0,"shareability":0,"sales_potential_estimate":0},
  "blueprint": [{"role":"","t_start_ms":0,"t_end_ms":0,"technique":"","purpose":""}],
  "why_it_works": [
    {"category":"growth|retention|emotion|sales|shareability",
     "claim":"", "evidence":[{"t_ms":0,"frame_id":""}], "confidence":"high|medium|low"}
  ],
  "design_language": {"palette":[],"lighting":"","typography":"","cut_rhythm_s":0,"motion_style":"","music_energy":""},
  "fixes": [{"rank":1,"change":"","t_ms":0,"expected_impact":"high|medium|low"}],
  "stats": [{"metric":"","value":0,"source":"","fetched_at":""}]
}
```
Validation rule: any `why_it_works` item with empty `evidence` is rejected and regenerated; after 2 failures it is dropped.

## 7. API (REST, versioned `/v1`)

| Method | Path | Purpose |
|---|---|---|
| POST | `/v1/videos` | Create from upload (multipart/presigned) or `{url}`; requires `rights_confirmed` |
| GET | `/v1/videos/{id}` | Status, stage, progress |
| GET | `/v1/videos/{id}/events` | SSE stream of progress |
| GET | `/v1/videos/{id}/report` | Full report JSON |
| GET | `/v1/videos/{id}/frames` | Frames with thumbnails + analysis |
| POST | `/v1/videos/{id}/stats` | Manual stats / CSV |
| POST | `/v1/compare` | `{video_a, video_b}` → diff job |
| POST | `/v1/concepts` | `{analysis_id, brief}` → concept job |
| GET | `/v1/concepts/{id}` | Concept + originality result |
| POST | `/v1/concepts/{id}/generate` | Start draft generation (checks originality + credits) |
| GET | `/v1/generations/{id}` | Status, output URL |
| GET | `/v1/me/credits` | Balance and ledger |
| DELETE | `/v1/videos/{id}` | Delete video and all derived data |

Auth: `Authorization: Bearer <jwt>`. All media via short-lived signed URLs.

## 8. Provider interfaces (swap anything)

```python
class VLMProvider(Protocol):
    def analyze_segment(self, frames, transcript, ocr, schema) -> dict: ...


class LLMProvider(Protocol):
    def complete_json(self, system, user, schema) -> dict: ...


class VideoGenProvider(Protocol):
    def generate_shot(
        self, prompt, style_lock, ref_image=None, seconds=3
    ) -> str: ...  # returns storage key


class TTSProvider(Protocol):
    def synthesize(self, text, voice, lang) -> str: ...


class StatsProvider(Protocol):
    def fetch(self, url) -> list[Stat]: ...
```
Implementations: `QwenVLProvider`, `VllmLLMProvider`, `LtxProvider`, `WanProvider`, `HiggsfieldProvider` (optional), `KokoroTTS`, `YtDlpStats`, `YouTubeApiStats`. Selected via env/config.

## 9. Originality check

1. Embed source frames (stored) and each planned/generated shot (image from generated frame, or text embedding of shot description).
2. Visual: `max(cosine(shot, source_frame)) < 0.80`.
3. Text: 5-gram overlap between new script and source transcript < 10%; no run of > 8 identical consecutive words.
4. Concept judge (text LLM, temp 0): compares blueprint-stripped premise of both; must answer "different premise, setting, characters, metaphor".
5. Result stored in `concepts.originality`; failing checks block generation and return concrete reasons plus a "regenerate with different angle" action.

Thresholds are config values, tuned on a golden set.

## 10. Model serving and GPU plan

| Service | Model | VRAM (rough) | Notes |
|---|---|---|---|
| vlm | Qwen3-VL (size by hardware: 8B–32B class, quantized if needed) | 16–48 GB | vLLM, one instance |
| llm | Qwen3 instruct (7–14B class) | 12–24 GB | Can share vlm if same family |
| whisper | faster-whisper (medium/large-v3) | 4–8 GB | CPU fallback possible |
| ocr/embeddings | PaddleOCR, open_clip | 2–4 GB | |
| videogen | LTX-2 (drafts), Wan 2.2/Hunyuan (quality) | 24–48 GB | Run separately from vlm; queue jobs |

v1 target: one 48 GB GPU (e.g., A6000-class) with vlm + llm resident and videogen loaded on demand, or two smaller GPUs. Verify exact VRAM by benchmarking; do not trust these numbers blindly. All numbers above are planning estimates.

## 11. Storage layout

```
s3://framedna/
  originals/{user_id}/{video_id}.{ext}
  proxies/{video_id}.mp4
  audio/{video_id}.wav
  frames/{video_id}/{t_ms}.jpg
  thumbs/{video_id}/{t_ms}.jpg
  generations/{concept_id}/{shot_index}.mp4
  exports/{concept_id}/final_{aspect}.mp4
  reports/{video_id}.pdf
```
Lifecycle: originals and proxies expire per `videos.expires_at` unless the user saves the project.

## 12. Security and privacy

- Signed, expiring URLs for all media; no public buckets.
- Row-level ownership checks on every query (`user_id`).
- Upload scanning hook (ClamAV optional), content-type and magic-byte validation, size/duration caps.
- Secrets only via env/secret manager; `.env` never committed.
- Rate limits per user and per IP; per-user concurrent job cap.
- Prompt-injection hygiene: transcript, OCR, and comments are **data**, never instructions; model outputs are validated against schema before use.
- Right-to-delete: `DELETE /videos/{id}` cascades to frames, embeddings, reports, generations, and storage objects.

## 13. Observability and cost

- Trace every job: `video_id`, stage, model version, duration, GPU seconds.
- Metrics: queue depth, stage latency P50/P95, failure rate, claims-with-evidence rate, originality pass rate.
- Cost per video computed from GPU seconds × rate; stored with the job for pricing decisions.

## 14. Testing strategy

- Unit: parsers, validators, schema checks, originality math.
- Integration: end-to-end on 5 golden videos (short ad, UGC reel, talking head, screen demo, music-led edit) with snapshot-style assertions on structure (not exact text).
- Evidence test: fail the build if > 5% of claims lack valid timestamps on golden set.
- Benchmark test: run the same 10 videos through two competitor tools manually and compare depth (human review).

## 15. Deployment

- Dev: `docker compose up` (web, api, redis, postgres, minio, workers; GPU services optional with CPU stub models).
- Prod v1: one GPU VM (RunPod/Vast/Lambda/own box) running Compose + Caddy/Traefik for TLS; frontend on Vercel or same box.
- Scale path: split GPU workers into separate nodes, autoscale by queue depth, move DB to managed Postgres.

## 16. Known constraints

- yt-dlp and link downloads may break or violate platform terms; upload is the primary path.
- Open video-generation quality is below top paid models; the provider interface allows plugging in Higgsfield/Kling/Veo later.
- Sales data is never derived from video; see PRD section 8.
- Model landscape changes fast; re-verify model names and licenses before each phase.
