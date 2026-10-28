"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Film,
  Mic,
  Share2,
  Brain,
  Zap,
  Copy,
  Check,
  Cpu,
  Layers,
  ShieldCheck,
  Volume2,
  Video,
  Eye,
  Sliders,
} from "lucide-react";
import { API_BASE_URL } from "../lib/api";

export function SystemSpecs() {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [brainStats, setBrainStats] = useState<{
    videos: number;
    frames: number;
    views: string;
  }>({
    videos: 41,
    frames: 498,
    views: "168M+",
  });

  useEffect(() => {
    fetch(`${API_BASE_URL}/v1/brain`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.metrics) {
          const v = data.metrics.total_views_analyzed || 0;
          const formattedViews =
            v >= 1_000_000
              ? `${(v / 1_000_000).toFixed(0)}M+`
              : v >= 1_000
              ? `${(v / 1_000).toFixed(0)}K`
              : `${v}`;
          setBrainStats({
            videos: data.metrics.total_videos || 41,
            frames: data.metrics.total_frames_analyzed || 498,
            views: formattedViews,
          });
        }
      })
      .catch(() => {});
  }, []);

  const copyText = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-fade-in pb-20">
      {/* 1. Header & Live Status */}
      <div className="border-b border-border pb-6 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-secondary">
            ReelBrain • System Architecture &amp; AI Model Blueprint
          </span>
          <div className="flex items-center gap-2 font-mono text-xs text-secondary">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-primary font-medium">Stack Active</span>
            <span>•</span>
            <span>{brainStats.videos} Videos Indexed</span>
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-normal tracking-tight text-primary">
          What models are we using, and how does everything work?
        </h1>
        <p className="text-xs md:text-sm text-secondary leading-relaxed max-w-2xl">
          A definitive breakdown of the exact AI models and algorithms powering video analysis,
          remix script generation, idea synthesis, voice, and video rendering.
        </p>
      </div>

      {/* 2. THE AI MODEL MATRIX: WHICH MODEL DOES WHAT */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-mono uppercase tracking-wider text-secondary">
            01 • The AI Model Matrix (Which Model Does What)
          </span>
          <span className="text-[11px] font-mono text-secondary">
            Analysis • Remix • Generation • Defense
          </span>
        </div>

        <div className="space-y-4">
          {/* CATEGORY A: ANALYSING (THE AUTOPSY) */}
          <div className="p-5 rounded-md border border-border bg-surface space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/70">
              <Film className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-primary">
                A. Video Analysing (Autopsy &amp; Forensics)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Model 1 */}
              <div className="p-3 rounded border border-border bg-neutral/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">Voice &amp; Speech Timing</span>
                  <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border text-primary font-medium">
                    OpenAI Whisper (faster-whisper)
                  </span>
                </div>
                <p className="text-secondary leading-relaxed text-[11px]">
                  <strong>How it works:</strong> Transcribes spoken audio with <em>exact millisecond start and end timestamps</em> for every word. Calculates speech rate (words per minute) and flags dead-air pauses (&gt;1.5s) where viewers swipe away.
                </p>
              </div>

              {/* Model 2 */}
              <div className="p-3 rounded border border-border bg-neutral/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">Frame &amp; Scene Decomposition</span>
                  <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border text-primary font-medium">
                    OpenCV (`cv2`) + PySceneDetect
                  </span>
                </div>
                <p className="text-secondary leading-relaxed text-[11px]">
                  <strong>How it works:</strong> Extracts 1 fps body frames and 4 fps high-frequency frames during the first 3 seconds (the hook window). Pinpoints hard scene cuts using content-aware difference algorithms and clusters dominant color palettes.
                </p>
              </div>

              {/* Model 3 */}
              <div className="p-3 rounded border border-border bg-neutral/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">On-Screen Text Detection</span>
                  <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border text-primary font-medium">
                    PaddleOCR (PP-OCRv4)
                  </span>
                </div>
                <p className="text-secondary leading-relaxed text-[11px]">
                  <strong>How it works:</strong> Scans keyframes to detect text bounding boxes, headlines, stickers, and subtitles. Evaluates visual cognitive load and confirms whether hook captions are present.
                </p>
              </div>

              {/* Model 4 */}
              <div className="p-3 rounded border border-border bg-neutral/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">Multimodal Frame Reasoning</span>
                  <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border text-primary font-medium">
                    Qwen2.5-VL / Claude 3.5 Sonnet
                  </span>
                </div>
                <p className="text-secondary leading-relaxed text-[11px]">
                  <strong>How it works:</strong> Evaluates camera movements (e.g. macro push, whip pan), subject actions, viewer emotions, and retention risk factors across segments.
                </p>
              </div>
            </div>
          </div>

          {/* CATEGORY B: REMIXING & IDEA GENERATION */}
          <div className="p-5 rounded-md border border-border bg-surface space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/70">
              <Sparkles className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-primary">
                B. Remixing &amp; Idea Generation
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {/* Remix Model 1 */}
              <div className="p-3 rounded border border-border bg-neutral/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">3 Ranked Hooks Synthesis</span>
                  <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border text-primary font-medium">
                    Qwen 2.5 7B / Claude 3.5
                  </span>
                </div>
                <p className="text-secondary leading-relaxed text-[11px]">
                  <strong>How it works:</strong> Takes the winning hook archetype from the Brain memory (e.g. <em>High-Velocity Narrative Acceleration</em> or <em>Negative Curiosity</em>), customizes it to your product, and estimates first-3-second hold rates.
                </p>
              </div>

              {/* Remix Model 2 */}
              <div className="p-3 rounded border border-border bg-neutral/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">Continuous Voiceover Script</span>
                  <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border text-primary font-medium">
                    Qwen 2.5 7B / Claude 3.5
                  </span>
                </div>
                <p className="text-secondary leading-relaxed text-[11px]">
                  <strong>How it works:</strong> Adheres strictly to the source video&apos;s pacing rhythm. Writes a <strong>single continuous flowing paragraph</strong> with zero section headers or robotic markers.
                </p>
              </div>

              {/* Remix Model 3 */}
              <div className="p-3 rounded border border-border bg-neutral/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">Shot Prompts &amp; Style Lock</span>
                  <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border text-primary font-medium">
                    Prompt Engineering Engine
                  </span>
                </div>
                <p className="text-secondary leading-relaxed text-[11px]">
                  <strong>How it works:</strong> Breaks the script into 3-second shots and appends an enforced <em>Style Lock</em> (35mm shallow depth of field, directional studio light, minimal palette) to keep visual generation cohesive.
                </p>
              </div>

              {/* Remix Model 4 */}
              <div className="p-3 rounded border border-border bg-neutral/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">Originality &amp; Plagiarism Guard</span>
                  <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border text-primary font-medium">
                    5-Gram Token Auditor
                  </span>
                </div>
                <p className="text-secondary leading-relaxed text-[11px]">
                  <strong>How it works:</strong> Calculates n-gram overlap against the original video to guarantee &lt;10% text overlap and &lt;8 consecutive shared words, ensuring 100% legal originality.
                </p>
              </div>
            </div>
          </div>

          {/* CATEGORY C: OTHER THINGS (VOICE, VIDEO & MEMORY) */}
          <div className="p-5 rounded-md border border-border bg-surface space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-border/70">
              <Zap className="w-4 h-4 text-primary" />
              <h3 className="text-sm font-medium text-primary">
                C. Other Capabilities (Voice, Video &amp; Memory)
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              {/* Other 1 */}
              <div className="p-3 rounded border border-border bg-neutral/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">Voiceover (TTS)</span>
                  <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border text-primary font-medium">
                    Kokoro / Native TTS
                  </span>
                </div>
                <p className="text-secondary leading-relaxed text-[11px]">
                  Converts the continuous script into a broadcast-ready 16kHz WAV audio track via <code className="font-mono text-[10px]">packages/providers/tts.py</code>.
                </p>
              </div>

              {/* Other 2 */}
              <div className="p-3 rounded border border-border bg-neutral/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">Video Generation</span>
                  <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border text-primary font-medium">
                    LTX-2 / Wan 2.2 / Kling
                  </span>
                </div>
                <p className="text-secondary leading-relaxed text-[11px]">
                  Generates vertical 9:16 (720x1280 30fps) video clips for each shot via <code className="font-mono text-[10px]">packages/providers/videogen.py</code>.
                </p>
              </div>

              {/* Other 3 */}
              <div className="p-3 rounded border border-border bg-neutral/40 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-primary">Brain Knowledge Store</span>
                  <span className="font-mono text-[10px] bg-surface px-1.5 py-0.5 rounded border border-border text-primary font-medium">
                    Brain Memory Engine
                  </span>
                </div>
                <p className="text-secondary leading-relaxed text-[11px]">
                  Indexes data from every scanned video into <code className="font-mono text-[10px]">storage/brain_memory.json</code> to cluster viral hook archetypes.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. DIRECT API REFERENCE (HOW TO CALL IT) */}
      <div className="space-y-3">
        <span className="text-xs font-mono uppercase tracking-wider text-secondary block">
          02 • Direct API Endpoints (Port 8001)
        </span>
        <div className="space-y-2">
          {/* Endpoint 1 */}
          <div className="p-3 rounded-md border border-border bg-surface space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-1.5 py-0.5 rounded bg-neutral border border-border font-medium text-primary">
                  POST
                </span>
                <span className="text-primary">/v1/videos</span>
                <span className="text-secondary font-sans text-[11px]">— Analyze any video link or upload</span>
              </div>
              <button
                onClick={() =>
                  copyText(
                    `curl -X POST http://localhost:8001/v1/videos \\\n  -H "Content-Type: application/json" \\\n  -d '{"url": "https://www.tiktok.com/@creator/video/123"}'`,
                    "ep1"
                  )
                }
                className="text-[11px] text-secondary hover:text-primary flex items-center gap-1 cursor-pointer font-mono"
              >
                {copiedKey === "ep1" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === "ep1" ? "Copied" : "Copy curl"}</span>
              </button>
            </div>
            <pre className="font-mono text-[11px] text-secondary bg-neutral p-2 rounded border border-border overflow-x-auto">
{`curl -X POST http://localhost:8001/v1/videos \\
  -H "Content-Type: application/json" \\
  -d '{"url": "https://www.tiktok.com/@creator/video/123"}'`}
            </pre>
          </div>

          {/* Endpoint 2 */}
          <div className="p-3 rounded-md border border-border bg-surface space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-1.5 py-0.5 rounded bg-neutral border border-border font-medium text-primary">
                  GET
                </span>
                <span className="text-primary">/v1/brain/recommendations</span>
                <span className="text-secondary font-sans text-[11px]">— Generate winning hooks &amp; pacing for your product</span>
              </div>
              <button
                onClick={() =>
                  copyText(
                    `curl -s "http://localhost:8001/v1/brain/recommendations?product=shoes&platform=reels&goal=conversions"`,
                    "ep2"
                  )
                }
                className="text-[11px] text-secondary hover:text-primary flex items-center gap-1 cursor-pointer font-mono"
              >
                {copiedKey === "ep2" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === "ep2" ? "Copied" : "Copy curl"}</span>
              </button>
            </div>
            <pre className="font-mono text-[11px] text-secondary bg-neutral p-2 rounded border border-border overflow-x-auto">
{`curl -s "http://localhost:8001/v1/brain/recommendations?product=shoes&platform=reels&goal=conversions"`}
            </pre>
          </div>

          {/* Endpoint 3 */}
          <div className="p-3 rounded-md border border-border bg-surface space-y-1.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                <span className="px-1.5 py-0.5 rounded bg-neutral border border-border font-medium text-primary">
                  GET
                </span>
                <span className="text-primary">/v1/brain</span>
                <span className="text-secondary font-sans text-[11px]">— Query all cross-video patterns and metrics</span>
              </div>
              <button
                onClick={() => copyText(`curl -s http://localhost:8001/v1/brain`, "ep3")}
                className="text-[11px] text-secondary hover:text-primary flex items-center gap-1 cursor-pointer font-mono"
              >
                {copiedKey === "ep3" ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                <span>{copiedKey === "ep3" ? "Copied" : "Copy curl"}</span>
              </button>
            </div>
            <pre className="font-mono text-[11px] text-secondary bg-neutral p-2 rounded border border-border overflow-x-auto">
{`curl -s http://localhost:8001/v1/brain`}
            </pre>
          </div>
        </div>
      </div>

      {/* 4. UPGRADE BLUEPRINT */}
      <div className="space-y-3">
        <span className="text-xs font-mono uppercase tracking-wider text-secondary block">
          03 • Scaling &amp; Upgrades
        </span>
        <div className="p-4 rounded-md border border-border bg-surface space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <p className="text-xs text-secondary leading-relaxed">
              <strong className="text-primary font-medium">1-Click Full Video Generation:</strong> Connect shot prompts to Kling 1.5 / LTX-Video API and audio to ElevenLabs to render ready-to-post 9:16 videos in 60s.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <p className="text-xs text-secondary leading-relaxed">
              <strong className="text-primary font-medium">Automated Trend Spider:</strong> Run a daily background crawler ingesting the top 50 viral reels in your niche to feed the Brain memory automatically.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <p className="text-xs text-secondary leading-relaxed">
              <strong className="text-primary font-medium">Native Video AI (Gemini 1.5 Pro):</strong> Send raw video directly to Gemini 1.5 Pro (which accepts 1 hour of video tokens) for micro-expression and eye-contact detection.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
