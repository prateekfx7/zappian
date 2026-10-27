# Golden Video Set

Location: `tests/golden/`

This folder contains the benchmark test videos used across all development phases to verify:
1. Video ingest and proxy normalization
2. Scene detection and frame extraction
3. Speech-to-text (STT) and OCR accuracy
4. VLM segment analysis & evidence validation (>= 95% claims with valid timestamps)
5. Remix generation and originality checks (< 0.80 visual similarity, < 10% 5-gram overlap)

## Required Videos (Rights-confirmed)

| ID | File Name | Category | Target Duration | Description | Rights Status |
|---|---|---|---|---|---|
| `g1` | `g1_product_ad.mp4` | Product Ad | 15–30s | E-commerce / D2C hook, feature demo, offer, CTA | Confirmed |
| `g2` | `g2_ugc_reel.mp4` | UGC Reel | 15–45s | Creator selfie-style testimonial, problem/solution | Confirmed |
| `g3` | `g3_talking_head.mp4` | Talking Head | 30–60s | Direct-to-camera educational hook, storytelling | Confirmed |
| `g4` | `g4_screen_demo.mp4` | Screen Demo | 30–60s | SaaS / digital app UI walkthrough with voiceover | Confirmed |
| `g5` | `g5_music_edit.mp4` | Music-Led Edit | 15–30s | Fast montage cut to musical beat with text overlays | Confirmed |

## Verification Rules
- Files must be MP4 / WebM / MOV format.
- Duration must be <= 180 seconds.
- Every claim produced by the pipeline MUST carry a timestamp present in the extracted frames.
