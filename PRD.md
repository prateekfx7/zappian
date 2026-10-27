# PRD: FrameDNA (working title) — Video Autopsy + Remix Engine

Version: 0.1 (draft) | Owner: Prateek | Status: Pre-build
Stack policy: open-source models and tools first; paid APIs only as optional, swappable providers.

---

## 1. One-line summary

Upload a video or paste a link. The platform analyses it frame by frame, explains **why it is growing / holding attention / selling**, shows its data, and then generates a **new, original video idea** (and optionally the video itself) that reuses the *structure* but **not** the content.

## 2. Problem

- Creators, editors, and agencies see videos that boom but cannot say *why*. They guess.
- Existing tools (ViralOS, ContentHooks, HookIQ, ViralGuru, Motion, Atria, Foreplay) mostly return a **score** plus generic tips. Ad-analytics tools need ad-account access and are priced for brands.
- Rebuilding a winning video without copying it is manual, slow, and legally risky.

## 3. Vision and positioning

> Others give a score. We give **proof, a diff, and a rebuild.**

Three pillars:
1. **Evidence-backed explanation.** Every claim links to a timestamp and a frame.
2. **Winner-vs-flop diff.** Explain why video A beat video B in structural terms.
3. **Blueprint → Remix.** Convert the video into a reusable structure and generate an original video from it, with a similarity check that proves it is not a copy.

Primary audience: freelance video editors, small agencies, and D2C creators who need client-ready explanations and fast, original variants.

## 4. Goals and non-goals

### Goals (v1)
- G1. Upload file or paste YouTube link → get a full report in under 5 minutes for a 60-second video.
- G2. Per-frame / per-timestamp breakdown: what is on screen, what is said, what the shot is doing, what the viewer feels.
- G3. A "why it works" explanation where **every claim has a timestamp**.
- G4. Show public stats (views, likes, comments, date) when obtainable.
- G5. Generate an original concept (hook options, script, shot list, voiceover, CTA) in a user-chosen style.
- G6. Run an originality check against the source and show pass/fail.
- G7. Run on an open-source stack that can be self-hosted.

### Non-goals (v1)
- N1. Fabricating sales numbers. **Sales data is private and is never guessed as fact.** See section 8.
- N2. Instagram/TikTok official-API integration (best-effort metadata only).
- N3. Full AI video generation at Higgsfield/Seedance quality. v1 produces draft-quality clips with open models; premium providers plug in later.
- N4. Guaranteeing virality. Scores are estimates.
- N5. Reusing any source footage, audio, text, or script in the output.

## 5. Personas

| Persona | Need | Success looks like |
|---|---|---|
| **Editor/Freelancer (primary)** | Explain edits to clients, win pitches, rebuild winning structures | Sends a branded report; delivers 3 original variants fast |
| **D2C founder / marketer** | Know why a competitor ad works; make their own | Gets a script + shot list for own product in minutes |
| **Agency lead** | Standardize creative research across clients | Saves blueprints, compares winner vs flop, exports reports |

## 6. User journeys

**J1 Analyse:** Upload/paste → progress screen → report (verdict, timeline, scores, stats, why-it-works, fixes).
**J2 Compare:** Upload two videos → diff report ("why A beat B").
**J3 Remix:** From a report → choose product, niche, platform, duration, style → get 3 hooks, script, shot list → originality check → (optional) generate draft video.
**J4 Library:** Save blueprints and reports, reopen, export PDF/share link.

## 7. Functional requirements

Priority: P0 = v1 must, P1 = v1.5, P2 = later.

### 7.1 Ingest
- FR-1 (P0) Upload MP4/MOV/WebM up to 500 MB and 3 minutes (configurable).
- FR-2 (P0) Paste YouTube URL; download via yt-dlp (best effort; user confirms rights).
- FR-3 (P1) Paste Instagram/TikTok URL (best effort; may fail; fall back to upload).
- FR-4 (P0) Rights checkbox: "I own this video or have permission to analyse it."
- FR-5 (P0) Validation, virus scan hook, duration/size limits, clear errors.

### 7.2 Processing and analysis
- FR-6 (P0) Extract frames at 1 fps plus a keyframe at every detected scene cut; store thumbnails.
- FR-7 (P0) Transcribe audio with word-level timestamps.
- FR-8 (P0) OCR on-screen text with timestamps.
- FR-9 (P0) Per-segment visual analysis by the video-language model (see architecture): shot type, subject, camera movement, text, emotion, role in structure.
- FR-10 (P0) Audio analysis: music energy, silence gaps, voiceover pace (words/sec), beat positions.
- FR-11 (P0) Produce a **Blueprint**: ordered beats (hook, problem, proof, demo, offer, CTA…) with start/end, purpose, and techniques.
- FR-12 (P0) Produce **scores (0–100)**: Hook, Retention, Emotion, Clarity, CTA, Shareability, Sales Potential (estimate).
- FR-13 (P0) Produce **why-it-works** items. Each item: claim, category, evidence timestamps, confidence (high/medium/low).
- FR-14 (P0) Produce **fix list**: top 5 changes ranked by expected impact, each tied to timestamps.
- FR-15 (P1) Predicted attention curve (per second), labeled as an estimate.

### 7.3 Stats
- FR-16 (P0) For YouTube links, fetch views, likes, comments, publish date, channel size (YouTube Data API or yt-dlp metadata).
- FR-17 (P0) Manual stats entry for any video (views, likes, comments, shares, saves, spend, sales).
- FR-18 (P1) CSV upload for sales/ad metrics (Shopify, Meta Ads exports).
- FR-19 (P0) Every stat shows its **source** (API / manual / CSV) and fetch time.

### 7.4 Compare
- FR-20 (P1) Two-video compare: align blueprints, diff hook, pacing, proof, CTA; explain why one performed better (uses stats if supplied).

### 7.5 Remix
- FR-21 (P0) Remix form: product/topic, audience, platform, duration, goal (leads/sales/brand), style, tone, language.
- FR-22 (P0) Generate: 3 hook options ranked, full script (as one continuous spoken paragraph plus a separate shot list), on-screen text, CTA.
- FR-23 (P0) Style Lock block: palette, lighting, lens, grade, motion, typography, applied to every shot prompt.
- FR-24 (P0) Shot prompts formatted for the chosen video model.
- FR-25 (P0) **Originality check** (see section 9): must pass before generation is offered.
- FR-26 (P1) Draft video generation via open model; assemble with captions, voiceover, music; export 9:16 / 1:1 / 16:9.
- FR-27 (P2) Premium provider plug-in (Higgsfield/Kling/Veo/Seedance) behind the same interface.

### 7.6 Library, export, accounts
- FR-28 (P0) Auth (email + OAuth), projects, history.
- FR-29 (P0) Report page with shareable private link.
- FR-30 (P1) PDF export with brand logo and colors.
- FR-31 (P1) Credits system and billing (Razorpay / Stripe).
- FR-32 (P2) Team seats, white-label reports, niche benchmarks.

## 8. Data and stats policy (critical)

| Data | Source | Rule |
|---|---|---|
| Views, likes, comments, date | Public metadata (YouTube API / yt-dlp) | Show with source + time |
| Shares, saves, retention graph | Only the video owner has it | Manual entry or CSV only |
| **Sales / revenue / conversions** | Only the seller has it | **Never inferred.** Manual/CSV/connector only. Without it show "Sales Potential Score (estimate)" with an explicit label |
| Why it's booming | Our analysis | Must cite timestamps and mark confidence |

The product must never present an estimate as measured data.

## 9. Originality and copyright

- Output reuses **structure and pacing logic only**. No source footage, audio, exact text, or script.
- Originality check (all must pass, thresholds are tunable defaults):
  - Visual: max cosine similarity between any generated/planned shot description-embedding or frame-embedding and any source frame < 0.80.
  - Text: transcript n-gram (5-gram) overlap < 10%, no sentence > 8 consecutive identical words.
  - Concept: LLM judge confirms the premise, setting, characters, and visual metaphor differ.
- Terms of use: user warrants rights to uploaded videos; we do not store videos longer than the retention period.
- Link downloading may breach some platform terms; uploads are the primary path, links are best-effort and the UI says so.
- Output is labeled AI-generated where required.

## 10. Report specification

1. **Verdict card:** one-sentence summary (what wins, what loses, where).
2. **Scores:** seven 0–100 scores with one-line reasons.
3. **Timeline:** per-second strip with beat colors; click a segment to jump to frame + explanation.
4. **Frame evidence:** thumbnail + what's happening + role + why it works.
5. **Stats card:** views/likes/comments/etc. with sources.
6. **Why it works:** claims grouped by Growth, Retention, Emotion, Sales, Shareability.
7. **Playbook:** 5–7 reusable rules.
8. **Fix list:** ranked top 5.
9. **Remix button.**

## 11. Non-functional requirements

- Performance: 60-second video analysed in ≤ 5 min on a single 24–48 GB GPU; UI never blocks (async jobs, live progress).
- Reliability: jobs are idempotent and resumable per stage; failed stage retried 3×.
- Security: signed URLs for media, per-user isolation, secrets in env/secret manager, no secrets in code.
- Privacy: user videos deleted after N days (default 30) unless saved; user can delete any time.
- Cost control: duration caps, per-user credit limits, GPU job queue with concurrency limits.
- Accessibility: keyboard-navigable timeline, readable contrast, captions on generated video.
- Observability: structured logs, job traces, per-stage timings and GPU cost.
- Portability: entire stack runs via Docker Compose.

## 12. Success metrics

| Metric | v1 target |
|---|---|
| Time to report (60s video) | ≤ 5 min |
| Claims with a valid timestamp | ≥ 95% |
| Report rated "useful" by users | ≥ 70% |
| Originality check pass rate on first remix | ≥ 85% |
| Weekly returning users (after launch) | ≥ 30% |
| Analysis cost per video | < ₹X (set after GPU benchmarking) |

## 13. Monetization (post-MVP)

Free: 3 analyses/month. Creator plan: credits for analyses + remixes. Agency plan: seats, branded PDFs, compare mode, API. Generation priced by credits because GPU time is the main cost.

## 14. Risks and mitigations

| Risk | Mitigation |
|---|---|
| Generic "why it works" text | Enforce evidence schema; reject claims without timestamps; benchmark vs. ViralOS/ContentHooks on the same 10 videos |
| Open video-gen quality below paid models | Draft-quality positioning; provider interface for premium models |
| GPU cost | Quantized models, caps, queue, credits |
| Platform ToS / copyright | Upload-first, rights checkbox, originality check, retention limits |
| Hallucinated stats | Source-labeled data only; sales never inferred |
| Model/version churn | Model registry + config, no hardcoded model names in business logic |
| Competitors copy features | Build dataset (video → structure → performance) and niche benchmarks from day one |

## 15. Open questions

1. Hardware: owned GPU / Apple Silicon (32GB+) or rented cloud GPU?
2. First niche (D2C reels, fitness, ecommerce, education)?
3. Is v1 a client demo (2–3 weeks) or a paid creator product?
4. Are Instagram/TikTok links mandatory for launch?
5. Which premium video provider (if any) for hero shots?

## 16. Release plan

See `phases.md`. v1 = Phases 0–4. v1.5 = Phase 5. v2 = Phase 6+.
