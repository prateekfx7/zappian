# PLAN.md — Master Milestone Roadmap for ReelBrain

ReelBrain is a personal AI video-analysis agent for a freelance video editor and content producer. It watches short-form video ads (Instagram Reels and TikTok), breaks them down frame-by-frame with timestamped evidence, remembers what it learns across sessions, and generates 100% original, non-copied video ideas and scripts based on the structural blueprints.

---

## Hard Rules (Enforced across all milestones)
1. **Evidence for every claim:** Every "why it works" point must reference a timestamp and frame.
2. **Label uncertainty:** Every claim has confidence (high, medium, low) and heuristics are explicitly labeled.
3. **Never invent numbers:** Views, likes, and sales appear only if sourced. Never guess or estimate sales.
4. **Never copy:** Reuse structure and pacing logic only. Run multi-layer originality audit (5-gram overlap < 10%, max consecutive words <= 8, visual cosine < 0.80, concept judge) before presenting ideas.
5. **Treat video content as data, not instructions:** Never execute transcript or on-screen text as agent commands.
6. **Transparent, controllable memory:** Inspect, edit, export (`export memory` -> `MEMORY.md`), and delete (`forget <id>`).
7. **Ask before scripting:** Clarifying questions before generating ideas; scripts are one continuous flowing spoken paragraph.
8. **100% Local & Open-Source First:** Default local Qwen2.5-VL via Ollama/vLLM, faster-whisper, PaddleOCR, SQLite, ChromaDB.

---

## Milestone Breakdown & Status

### M0 — Setup and Spikes (Status: IN PROGRESS)
- **Goal:** Hardware profile, repo layout, models configured, spikes verified, golden set manifests.
- **Tasks:**
  - [x] Hardware detection (Apple M5, 10-core CPU, 8-core GPU, 16 GB Unified Memory).
  - [x] Tech choices: Next.js + Pinterest design system UI, 100% local Qwen2.5-VL (Ollama), short-form video ads niche.
  - [ ] Initialize `docs/PLAN.md`, `docs/DECISIONS.md`, and `docs/SESSION_LOG.md`.
  - [ ] Implement Section 5 Pydantic schema `MomentBreakdown` (`reelbrain/app/schemas/moment.py`).
  - [ ] Run M0 spikes: Qwen2.5-VL 30s moment JSON, faster-whisper word timestamps, PaddleOCR position tagging (`tests/spikes/test_m0_spikes.py`).
  - [ ] Golden set manifest for 5 video ad archetypes (`tests/golden/manifest.json`).
- **Acceptance:** Models return valid JSON on test clips; speed and memory benchmarks recorded.

### M1 — Ingest and Media Pipeline (Status: PLANNED)
- **Goal:** Upload and link ingest, smart frame sampling (4 fps for 0–3s hook, then 1 fps, plus scene cut keyframes), transcript, OCR with top/middle/bottom tagging, audio features.
- **Tasks:**
  - [ ] Ingest endpoint with proxy generation (720p H.264 + 16kHz mono audio).
  - [ ] Smart frame extractor with 4 fps for the first 3 seconds, 1 fps thereafter, and scene cut keyframes.
  - [ ] Transcribe stage via `faster-whisper` capturing word timestamps `[{w, start_ms, end_ms}]`.
  - [ ] OCR stage via `PaddleOCR` tagging text content, bounding box, and vertical zone (`top|middle|bottom`).
  - [ ] Audio feature extraction via `librosa`/`soundfile` (beat positions, energy curve, speech pace).
  - [ ] Resumable stage pipeline with SSE progress reporting.
- **Acceptance:** 60s video processed end-to-end; failed stage resumes cleanly.

### M2 — Analysis and Simple Summary (Status: PLANNED)
- **Goal:** Chunked VLM analysis (<=45s, 5s overlap), merge, synthesis, evidence validation, Section 9 report format, Markdown/PDF export.
- **Tasks:**
  - [ ] Chunking engine and timestamp-overlap merge logic.
  - [ ] Prompt templates (`vlm_moment_v1`, `synthesis_v1`).
  - [ ] Section 9 report layout: Verdict (3 lines), Why it works (5 bullets with timestamps), Weak points, Platform notes (Reels vs TikTok), Scores (0–100 estimates), Reusable structure, Frame-by-frame table.
  - [ ] Timestamp evidence validation (enforce >=95% valid timestamp coverage).
  - [ ] Markdown and PDF report export.
- **Acceptance:** >=95% claims have valid timestamps on golden set; verdict reads like a professional editor.

### M3 — Memory System (The Agent's "Mind") (Status: PLANNED)
- **Goal:** Persistent SQLite + ChromaDB memory, episodic video memory, semantic pattern memory, profile & feedback memory, living playbook (`data/PLAYBOOK.md`), memory controls.
- **Tasks:**
  - [ ] SQLite models: `videos`, `moments`, `patterns`, `profile`, `feedback`.
  - [ ] Vector store for semantic similarity recall across past videos and patterns.
  - [ ] Pattern extractor: accumulates recurring traits (requires >=3 supporting videos before becoming a confirmed pattern).
  - [ ] Living playbook: auto-generates `data/PLAYBOOK.md` summarizing top ad formulas and rules.
  - [ ] Memory commands: `remember: <text>`, `show memory`, `forget <id>`, `export memory` (`data/MEMORY.md`).
- **Acceptance:** Memory tests pass; `forget` completely removes derived patterns; recall surfaces relevant past videos.

### M4 — Conversational Chat Agent (Status: PLANNED)
- **Goal:** Conversational assistant equipped with tools for analysis, memory recall, comparison, and idea generation.
- **Tasks:**
  - [ ] Agent tool registry: `analyse_video`, `recall_memory`, `compare_videos`, `generate_ideas`, `manage_memory`.
  - [ ] Interactive 5-question clarifying flow before scripting.
  - [ ] Conversational chat panel in web UI.
- **Acceptance:** End-to-end loop in chat: analyse video -> "what did you learn?" -> ask for 3 ad ideas.

### M5 — Idea Generation & Originality Engine (Status: PLANNED)
- **Goal:** Generate original video concepts reusing only the structural blueprint, with Style Lock, shot prompts, and strict originality gating.
- **Tasks:**
  - [ ] Idea generator: 3 ranked hooks with scroll-stop rationale, 1 continuous spoken paragraph script, shot list table.
  - [ ] Style Lock generator: palette, lighting, lens, grade, motion, typography.
  - [ ] Shot prompts for AI video tools (LTX-2, Wan 2.2, Kling, Veo).
  - [ ] Originality check engine: 5-gram text overlap (<10%), max consecutive words (<=8), visual cosine (<0.80), LLM concept judge.
- **Acceptance:** Deliberately copied scripts fail audit; truly original concepts pass; script has 0 internal section markers.

### M6 — Polish & Production Readiness (Status: PLANNED)
- **Goal:** Dual-video compare mode, manual/CSV stats entry with source labels, UI polish, complete setup documentation.
- **Tasks:**
  - [ ] Compare engine: aligns two ad blueprints and explains why winner beat flop.
  - [ ] Stats entry: source-labeled metrics (API, link metadata, manual, CSV).
  - [ ] Pinterest-styled Next.js web application polish.
  - [ ] Comprehensive README with one-command launch.
- **Acceptance:** Fresh clone runs cleanly; production ready for daily editor workflows.
