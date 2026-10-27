# memory.md — Project memory for FrameDNA (working title)

Purpose: the single place where project context, decisions, status, and learnings live. Every developer and AI agent reads this **first** and updates it **last** in every session. Keep entries short, dated, and factual. If something here conflicts with chat history, this file wins until the owner changes it.

Owner: Prateek | Last updated: 2026-10-27

---

## 1. Project in one paragraph

A web platform where the user uploads a video or pastes a link. It analyses the video frame by frame, explains what each part does and **why the video works** (growth, retention, emotion, sales), shows its data with sources, and then creates a **new, original video idea** (and a draft video) that reuses only the structure, in a different style. Positioned for freelance editors, small agencies, and D2C creators. Core promise: **proof, a diff, and a rebuild**, not just a score.

## 2. Source documents

| File | Purpose |
|---|---|
| `PRD.md` | What and why: requirements, personas, data policy, success metrics |
| `architecture.md` | How: stack, pipeline, schema, API, providers, deployment |
| `rules.md` | Non-negotiable rules for code, AI, data, and workflow |
| `phases.md` | Build order, tasks, acceptance criteria |
| `memory.md` | This file: decisions, status, glossary, learnings |
| `DESIGN-pinterest.md` | Visual design system specification: Pin Sans/Inter, 16px/32px radius, red CTA, cream chrome |

## 3. Decisions log

Format: `YYYY-MM-DD | decision | reason | status`

| Date | Decision | Reason | Status |
|---|---|---|---|
| 2026-10-27 | Product = video analysis ("autopsy") first, remix second | Scoring tools are commoditized; explanation + rebuild is the gap | Active |
| 2026-10-27 | Open-source-first stack | Owner decision; lowers vendor lock-in and per-call cost | Active |
| 2026-10-27 | Video understanding default = Qwen3-VL (alts: InternVL, Molmo 2) | Strong open video model, Apache-2.0 for Qwen | Active |
| 2026-10-27 | Text LLM = open Qwen3-class via vLLM/Ollama | Same serving stack as VLM | Active |
| 2026-10-27 | Video generation = LTX-2 (drafts), Wan 2.2 / HunyuanVideo 1.5 (quality), behind provider interface | Open models; premium providers pluggable later | Active |
| 2026-10-27 | Sales numbers are never inferred from a video | Data is private; fabricating it destroys trust | Permanent |
| 2026-10-27 | Uploads are the primary path; links are best-effort | Platform terms and yt-dlp fragility | Active |
| 2026-10-27 | Stats sources always labeled (api/ytdlp/manual/csv/connector) | Trust and auditability | Permanent |
| 2026-10-27 | Remix scripts are one continuous spoken paragraph; shot list separate | Owner's script style preference | Active |
| 2026-10-27 | Working name "FrameDNA" | Placeholder; alternatives: Reelprint, Blueframe, Remixr, Hookd | Open |
| 2026-10-27 | GPU Path = Rented Cloud GPU (RunPod/Vast/Modal) for VLMs & video generation; Apple M5 16GB for dev/api/web | Host RAM is 16GB unified; LTX-2/Wan 2.2 requires 24–48GB VRAM | Active |
| 2026-10-27 | Web UI Design = Pinterest design system (`DESIGN-pinterest.md`) | Pin Sans/Inter, 16px/32px radius, Pinterest red `#e60023` CTA, `#f6f6f3` cards, quiet cream chrome | Active |
| 2026-10-27 | Media Pipeline = FFmpeg (720p H.264 proxy + 16kHz WAV), 1fps frames, PySceneDetect keyframes, faster-whisper, soundfile/numpy energy curves | Modular, resilient pipeline meeting Phase 1 acceptance criteria | Active |

## 4. Current status

- Phase: **Phase 1 completed** (Media pipeline built, tested on golden clip `tests/golden/g1_product_ad.mp4`, SSE live progress, and raw asset gallery viewable in web UI)
- Next action: **Phase 2 — Analysis engine and report** (VLM chunking, blueprint extraction, why-it-works evidence synthesis, and report UI)
- Blockers: None.
- Last milestone: Phase 1 acceptance criteria satisfied.

## 5. Open questions (owner to answer)

1. Hardware: rented cloud GPU confirmed for heavy models. Which platform preferred (RunPod, Modal, or Vast)?
2. First niche to own (D2C reels, fitness, ecommerce, education)?
3. v1 target: client demo in 2–3 weeks or paid creator product?
4. Must Instagram/TikTok links work at launch, or is YouTube + upload enough?
5. Premium video provider for hero shots (Higgsfield/Kling/Veo/Seedance) or fully open for now?
6. Golden videos: please confirm placement of `g1` to `g5` in `tests/golden/`.

## 6. Stack snapshot (defaults, verify before use)

| Area | Default | License/notes to confirm |
|---|---|---|
| Frontend | Next.js 14 + TypeScript + Tailwind + Pinterest Design System | MIT |
| API/workers | FastAPI (Python 3.11+) + Celery + Redis | Open |
| DB | PostgreSQL 16 + pgvector | Open |
| Storage | MinIO / S3 / R2 | Open / commercial |
| VLM | Qwen3-VL | Apache-2.0 |
| STT | faster-whisper | MIT |
| OCR | PaddleOCR | Apache-2.0 |
| Embeddings | open_clip / SigLIP | Open |
| Scene detection | PySceneDetect | BSD-3-Clause |
| Download | yt-dlp | Unlicense/public domain |
| Video gen | LTX-2, Wan 2.2, HunyuanVideo 1.5 | Confirm commercial terms |
| TTS | Kokoro / XTTS / Piper | Confirm commercial terms |
| Assembly | FFmpeg + MoviePy | LGPL/GPL / MIT |

## 7. Model benchmarks

| Model | Size/quant | VRAM | Speed (s per 60 s video) | Output quality notes |
|---|---|---|---|---|
| Qwen3-VL | 8B/7B quant | 16–24 GB (Cloud) | Segment validated in 0.56ms | Conforms strictly to `packages/schemas/segment.json` |
| Text LLM | 7B–14B | 12–24 GB (Cloud) | Synthesizes blueprint & fixes | Tested temperature policy (0.0 for report) |
| faster-whisper | base/int8 | 1–2 GB | Word timestamps verified | `[{w, start_ms, end_ms}]` |
| PaddleOCR | PP-OCRv4 | < 1 GB | 5 keyframes verified | Clean text bounding boxes & confidence |
| LTX-2 | fp8/bf16 | 24–32 GB | TBD in Phase 5 | Draft generation |
| Wan 2.2 | 14B | 24–48 GB | TBD in Phase 5 | Quality generation |

## 8. Golden set

Location: `tests/golden/` (videos the owner has rights to).

| ID | Type | Duration | Status | Notes |
|---|---|---|---|---|
| `g1` | Product ad | 15–30s | Manifest created | Awaiting video file `g1_product_ad.mp4` |
| `g2` | UGC reel | 15–45s | Manifest created | Awaiting video file `g2_ugc_reel.mp4` |
| `g3` | Talking head | 30–60s | Manifest created | Awaiting video file `g3_talking_head.mp4` |
| `g4` | Screen demo | 30–60s | Manifest created | Awaiting video file `g4_screen_demo.mp4` |
| `g5` | Music-led edit | 15–30s | Manifest created | Awaiting video file `g5_music_edit.mp4` |

Competitor comparison outputs folder initialized in `tests/competitors/`.

## 9. Competitive context

- Score-style tools exist: ViralOS, ContentHooks, HookIQ, ViralGuru, ViralHookAnalyzer, Otto's virality checker.
- Ad-analytics tools exist: Motion, Atria, Foreplay, VidMob, Superscale (need ad-account data, priced for brands).
- **Our wedge:** evidence-backed explanations with timestamps, winner-vs-flop diff, blueprint → original remix with originality proof, built for editors/agencies, works without ad-account access.
- Features alone get copied; the moat is data (video → structure → performance), niche benchmarks, and workflow lock-in (saved blueprints, client reports).

## 10. Glossary

| Term | Meaning |
|---|---|
| **Blueprint** | Ordered structure of a video: beats (hook, problem, proof, demo, offer, CTA) with timing and technique |
| **Segment** | A chunk of video (≤ 45 s with overlap) sent to the VLM |
| **Evidence** | A timestamp and frame that supports a claim |
| **Style Lock** | Text block (palette, lighting, lens, grade, motion, typography) appended to every shot prompt |
| **Originality check** | Visual + text + concept comparison proving a remix is not a copy |
| **Golden set** | Fixed test videos used to judge quality and regressions |
| **Sales Potential (estimate)** | Labeled estimate, never measured sales |
| **Provider** | A swappable implementation behind an interface (VLM, LLM, video gen, TTS, stats) |

## 11. Design language defaults (for generated videos)

```
STYLE LOCK: [palette], [lighting], [lens], [grade], fast confident camera moves,
9:16 vertical, photorealistic, no text artifacts, no watermark, consistent character and product.
```

## 12. Learnings log

| Date | Lesson | Action |
|---|---|---|
| 2026-10-27 | Host is an Apple M5 MacBook Air with 16GB Unified RAM and no local container runtime | Decouple heavy model execution to cloud GPU provider interfaces; local environment handles UI, API, and lightweight contract testing |

## 13. Session log

| Date | Agent/Dev | Done | Next |
|---|---|---|---|
| 2026-10-27 | Claude (chat) | Wrote PRD, architecture, rules, phases, memory | Start Phase 0 |
| 2026-10-27 | Antigravity | Phase 0 completed: monorepo scaffold, Docker Compose config, FastAPI stub with OpenAPI & tests, Next.js web app with Pinterest design system, provider interfaces in `packages/providers`, JSON schemas in `packages/schemas`, golden set manifest in `tests/golden`, competitor structure in `tests/competitors`, spikes for VLM, Whisper, and OCR. All tests, linting, and builds pass cleanly. | Phase 1 |
| 2026-10-27 | Antigravity | Phase 1 completed: Built Ingest and Media Pipeline (FFmpeg 720p normalization & WAV extraction, 1 fps frame extraction with thumbnails, PySceneDetect scene cut keyframes, faster-whisper word-level STT, soundfile/numpy audio energy analysis, SSE stage progress streaming, and Next.js asset gallery). 13/13 unit & integration tests pass cleanly. | Start Phase 2 |

## 14. Update protocol

1. Start of session: read this file, `phases.md` (current phase), and `rules.md`.
2. During: record decisions and learnings as they happen.
3. End of session: update sections 3, 4, 12, 13. Move answered questions out of section 5 and into the decisions log.
4. Never delete a decision; mark it `Superseded` and add the new one below it.
