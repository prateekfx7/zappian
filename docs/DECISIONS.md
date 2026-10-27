# DECISIONS.md — Architecture & Technical Decisions Log

Format: `YYYY-MM-DD | decision | reason | status`

---

## Decisions Table

| Date | Decision | Reason | Status |
|---|---|---|---|
| 2026-10-27 | Target Niche = Short-form Video Ads (D2C, paid social, Reels, TikTok) | Owner choice; highest-value application for frame autopsy, hook retention, and original ad variations | Active |
| 2026-10-27 | UI Architecture = Full-stack Next.js Web App with Pinterest Design System (`DESIGN-pinterest.md`) | Owner choice; delivers a premium, responsive experience with frame scrubbers, live video player, and interactive memory explorer | Active |
| 2026-10-27 | VLM Model = 100% Local Qwen2.5-VL via local Ollama / vLLM | Owner choice; guarantees 100% offline privacy, zero vendor lock-in, and zero API costs | Active |
| 2026-10-27 | Local Model Sizing = Qwen2.5-VL 7B Q4 / 3B on Apple M5 16GB Unified RAM | Host has 16GB RAM; 7B 4-bit fits in ~4.8GB, leaving 10GB+ for macOS and background services | Active |
| 2026-10-27 | Speech-to-Text = faster-whisper (`base.en` / `small.en`) with int8 quantization | Fast, highly accurate word-level timestamps `[{w, start_ms, end_ms}]` on Apple Silicon | Active |
| 2026-10-27 | On-Screen Text OCR = PaddleOCR with vertical zone classification (`top|middle|bottom`) | Detects on-screen captions and identifies whether text violates TikTok/Reels UI safe zones | Active |
| 2026-10-27 | Storage Architecture = SQLite (`data/reelbrain.db`) + ChromaDB (`data/vectors/`) | Zero-ops local storage for structured video metadata, semantic pattern search, and vector embeddings | Active |
| 2026-10-27 | Smart Frame Sampling = 4 fps for 0–3s hook, 1 fps thereafter + scene cut keyframes | In short-form video ads, the first 3 seconds determine 80% of retention; high temporal resolution on the hook is vital | Active |
| 2026-10-27 | Spoken Script Format = One continuous flowing paragraph with no section markers | Owner requirement (Rule 21 & Section 7); spoken voiceovers must flow naturally when read | Active |
| 2026-10-27 | Originality Audit Gate = 5-gram overlap < 10%, max consecutive words <= 8, visual cosine < 0.80, concept judge | Strict anti-plagiarism guard ensuring generated ad concepts are original rebuilds, never copies | Active |
| 2026-10-27 | Memory Governance = Living Playbook (`data/PLAYBOOK.md`), `remember`, `show memory`, `forget <id>`, `export memory` | Full transparency and user sovereignty over episodic, semantic, and profile memory | Active |
| 2026-10-27 | Sales Data Policy = Never invent or estimate sales numbers | Strict trust rule; if no sales data is supplied, explicitly state "no sales data provided" | Permanent |
| 2026-10-27 | Evidence Rule = Fail build if > 5% of claims lack a valid timestamp | Ground truth integrity; no hallucinated claims allowed in autopsy reports | Permanent |
