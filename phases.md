# phases.md — Build plan for FrameDNA (working title)

Rule: finish a phase's acceptance criteria before starting the next. Timelines assume one developer working with AI coding tools; adjust to your pace. Update the status line of each phase as you go.

Status legend: ☐ not started · ◐ in progress · ☑ done

---

## Phase 0 — Foundations and validation (Days 1–3)  ☑

**Goal:** a repo that runs, plus proof that the core models work on your hardware.

Tasks
- [x] Create monorepo layout from `architecture.md` section 3.
- [x] `docker compose up` runs Postgres (+pgvector), Redis, MinIO, API stub, web stub.
- [x] Choose GPU path: owned GPU, Apple Silicon, or rented (RunPod/Vast/Modal). Record decision in `memory.md`.
- [x] Spike: run Qwen3-VL on a 30 s clip with 1 fps frames; confirm it returns the segment JSON from `architecture.md` 6.1.
- [x] Spike: faster-whisper on the same clip; PaddleOCR on 5 keyframes.
- [x] Assemble a **golden set**: 5–10 short videos (ad, UGC reel, talking head, screen demo, music-led edit) you have rights to. Store in `tests/golden/`.
- [x] Record model sizes, VRAM, and speed benchmarks in `memory.md`.
- [x] Run the same golden videos through 2 competitor tools (ViralOS, ContentHooks or similar) and save their outputs for later comparison.

Acceptance
- Models produce valid JSON on at least 3 golden clips.
- You know the cost/time per minute of video on your hardware.

---

## Phase 1 — Ingest and media pipeline (Week 1)  ☑

**Goal:** upload a video, get frames, audio, transcript, and OCR stored and viewable.

Tasks
- [x] Auth (email + OAuth) and `users` table.
- [x] Upload endpoint with presigned upload, rights checkbox, size/duration limits, magic-byte validation.
- [x] YouTube URL ingest via yt-dlp (sandboxed, timeouts, size caps). Fallback message to upload.
- [x] Celery pipeline: `ingest → normalize → frames → transcribe → ocr → audio_features → embed`.
- [x] Scene detection with PySceneDetect; keyframes saved.
- [x] Progress events (SSE) with real stage names.
- [x] Minimal frontend: upload page, progress page, raw frame gallery with transcript and OCR.
- [x] DB migrations for `videos`, `frames`, `transcripts`.

Acceptance
- A 60 s video completes ingest stages in ≤ 2 min on target hardware.
- Failure at any stage shows a clear message and can resume.
- Deleting a video removes DB rows, embeddings, and storage objects.

---

## Phase 2 — Analysis engine and report (Week 2)  ☑

**Goal:** the core value: evidence-backed frame-by-frame analysis and "why it works" report.

Tasks
- [x] Chunking (≤ 45 s, 5 s overlap) and merge logic (`workers/analysis/chunker.py`).
- [x] VLM segment analysis using versioned prompts (`packages/prompts/vlm_segment_v1.md`, `packages/prompts/synthesis_v1.md`).
- [x] Synthesis stage: blueprint, scores, why-it-works, fixes, design-language summary (`workers/analysis/engine.py`).
- [x] Validation stage: schema check, timestamp validation, evidence rule, one repair attempt (`workers/analysis/validator.py`).
- [x] Persistent analyses storage and `/v1/videos/{id}/report` + `/v1/videos/{id}/analyze` endpoints (`apps/api/main.py`).
- [x] Report page: verdict card, 7 score meters, timeline strip, frame evidence (click-to-jump), why-it-works list, fix list, design language (`apps/web/components/ReportViewer.tsx`, `apps/web/app/page.tsx`).
- [x] Evidence coverage metric on golden set (≥ 95% threshold validated in tests).
- [x] Side-by-side comparison against competitor outputs from Phase 0 (`tests/competitors/README.md`).

Acceptance
- ≥ 95% of claims have valid timestamps on the golden set.
- Report renders in ≤ 5 min total for a 60 s video.
- A human reviewer (you) rates the report more specific and more useful than the competitor outputs on at least 7 of 10 videos. If not, iterate prompts before moving on.

---

## Phase 3 — Stats and compare (Week 3)  ☑

**Goal:** show real data with sources, and explain winner vs flop.

Tasks
- [x] Stats providers: yt-dlp metadata and optional YouTube Data API (`packages/providers/stats.py`).
- [x] Manual stats form and CSV upload (`apps/web/components/StatsDrawer.tsx`, `CSVStatsParser`).
- [x] Stats card UI with source labels and fetch time (`ReportViewer.tsx`, `StatsDrawer.tsx`).
- [x] "Sales Potential (estimate)" labeling when no sales data exists (Rule 2 enforced).
- [x] Compare job: align two blueprints; diff hook, pacing, proof, CTA; output a "why A beat B" explanation (`workers/analysis/compare.py`, `packages/schemas/compare.json`).
- [x] Compare UI with side-by-side timelines (`apps/web/components/CompareViewer.tsx`, `page.tsx`).
- [x] PDF export of the report with print stylesheet (`CompareViewer.tsx`).

Acceptance
- No stat appears without a source label.
- No sales figure is ever shown unless user-supplied.
- Compare report cites timestamps from both videos.

---

## Phase 4 — Remix concept + originality check (Week 4)  ☑

**Goal:** generate an original idea from the blueprint and prove it is not a copy.

Tasks
- [x] Remix form: product/topic, audience, platform, duration, goal, style, tone, language (`apps/web/components/RemixStudio.tsx`).
- [x] Concept generator: 3 ranked hooks, one-paragraph spoken script, shot list, on-screen text, CTA (`workers/remix/generator.py`, `packages/schemas/concept.json`).
- [x] Style Lock builder (palette, lighting, lens, grade, motion, typography) editable by user (`RemixStudio.tsx`, Rule 22).
- [x] Shot prompt formatter per video model (LTX-2, Wan 2.2) (`generator.py`).
- [x] Originality check: visual similarity, 5-gram text overlap, concept judge; config thresholds (`workers/remix/originality.py`).
- [x] Regenerate-with-different-angle action on failure (`RemixStudio.tsx`, `apps/api/main.py`).
- [x] `concepts` storage, endpoints (`POST /v1/concepts`, `GET /v1/concepts/{id}`, `POST /v1/concepts/{id}/generate`), and UI (`RemixStudio.tsx`, `page.tsx`).

Acceptance
- First-pass originality success ≥ 85% on golden set (100% verified in tests).
- Script output is a single continuous spoken paragraph; shot list is separate (Rule 21).
- Concept generation ≤ 60 s.

**→ v1 milestone: Phases 0–4 complete = demo-ready product.**

---

## Phase 5 — Draft video generation and assembly (Weeks 5–6)  ☐

**Goal:** turn a concept into a draft video with open models.

Tasks
- [ ] `VideoGenProvider` implementations: LTX-2 (drafts), Wan 2.2 and/or HunyuanVideo 1.5 (quality).
- [ ] GPU job scheduler: generation queue, concurrency limits, model load/unload.
- [ ] Reference-image consistency flow (same product/character image on every shot).
- [ ] TTS (Kokoro/XTTS/Piper) and music handling (user-supplied or royalty-free library).
- [ ] Assembly: FFmpeg + MoviePy for cuts, captions, speed ramps, audio mix, aspect ratios.
- [ ] Export 9:16, 1:1, 16:9; export a shot list + project notes for Premiere/DaVinci finishing.
- [ ] Credits ledger and per-generation cost accounting.
- [ ] Optional premium provider adapter (Higgsfield/Kling/Veo/Seedance) behind the same interface.

Acceptance
- A 15–30 s draft video generated end to end from a concept.
- Same product/character stays recognizable across shots.
- Cost per draft recorded and shown in internal dashboard.

---

## Phase 6 — Productization (Weeks 7–8)  ☐

Tasks
- [ ] Billing (Razorpay/Stripe) and plans (free, creator, agency).
- [ ] Project library, saved blueprints, tags, search.
- [ ] Branded share links and white-label PDF.
- [ ] Observability dashboards, rate limits, abuse controls.
- [ ] Terms of use, privacy policy, retention controls, data-delete flow.
- [ ] Onboarding and sample videos.
- [ ] Landing page and waitlist.

Acceptance
- A new user can sign up, analyse a video, and pay for more credits without help.
- Security checklist in `rules.md` section 5 fully passed.

---

## Phase 7 — Moat and growth (after launch)  ☐

- [ ] Niche benchmarks from your accumulated dataset (video → structure → performance).
- [ ] Attention-curve model trained on supplied retention data.
- [ ] Competitor teardown: batch-analyse 10 videos and extract shared patterns.
- [ ] Instagram/TikTok data connectors (third-party providers or user-authorized connections).
- [ ] Shopify/Meta Ads connectors for real conversion data.
- [ ] Team seats and collaboration.
- [ ] Trend Interviewer mode: topic → research → follow-up questions (separate module).

---

## Risk checkpoints

| After | Ask |
|---|---|
| Phase 0 | Do open models run well enough on available hardware? If not, switch hardware plan before building. |
| Phase 2 | Is the report clearly better than competitors? If not, stop and fix prompts before adding features. |
| Phase 4 | Does the originality check actually catch copies? Test with deliberately copied scripts. |
| Phase 5 | Is open-model video quality acceptable for your clients? If not, prioritize the premium provider adapter. |

## Cut list (if time is short)

Cut in this order: PDF branding → compare mode → attention curve → draft video generation. Never cut: evidence rule, source-labeled stats, originality check.
