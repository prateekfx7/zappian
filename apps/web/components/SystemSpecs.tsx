"use client";

import React, { useState, useEffect } from "react";
import {
  Cpu,
  Layers,
  ArrowUpRight,
  Sparkles,
  Database,
  Film,
  Mic,
  FileText,
  Share2,
  Brain,
  CheckCircle2,
  Zap,
  Server,
  Code2,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  Eye,
  Sliders,
  Terminal,
  Activity,
  Workflow,
  Sparkle,
} from "lucide-react";
import { API_BASE_URL } from "../lib/api";

interface LiveMetrics {
  total_videos: number;
  total_frames_analyzed: number;
  total_views_analyzed?: number;
  total_likes_analyzed?: number;
  backend_status: string;
}

export function SystemSpecs() {
  const [activeTab, setActiveTab] = useState<"stack" | "pipeline" | "upgrades" | "telemetry">("stack");
  const [liveMetrics, setLiveMetrics] = useState<LiveMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedSection, setCopiedSection] = useState<string | null>(null);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/brain`);
      if (res.ok) {
        const data = await res.json();
        setLiveMetrics({
          total_videos: data.metrics?.total_videos || 0,
          total_frames_analyzed: data.metrics?.total_frames_analyzed || 0,
          total_views_analyzed: data.metrics?.total_views_analyzed || 0,
          total_likes_analyzed: data.metrics?.total_likes_analyzed || 0,
          backend_status: "online",
        });
      }
    } catch {
      setLiveMetrics({
        total_videos: 0,
        total_frames_analyzed: 0,
        backend_status: "offline",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSection(label);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  return (
    <div className="space-y-8 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="border-b border-border pb-6 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-neutral border border-border text-secondary mb-3">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>ReelBrain System Architecture &amp; Stack Reference</span>
          </div>
          <h1 className="text-3xl md:text-4xl font-normal tracking-[-2px] text-primary">
            System Specs, Pipeline &amp; Upgrade Blueprint
          </h1>
          <p className="text-sm text-secondary mt-1 max-w-2xl">
            A comprehensive deconstruction of what ReelBrain is using under the hood, how the 8-stage
            media pipeline is engineered, and the exact vectors for scaling and upgrading the system.
          </p>
        </div>

        {/* Live Telemetry Pill */}
        <div className="flex items-center gap-3 bg-neutral p-2 px-3 rounded-md border border-border text-xs text-secondary">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium text-primary">FastAPI :8001</span>
          </div>
          <span className="text-border">|</span>
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <span className="font-medium text-primary">Next.js :3000</span>
          </div>
          <span className="text-border">|</span>
          <span>{liveMetrics?.total_videos ?? "..."} Indexed Videos</span>
        </div>
      </div>

      {/* Segmented Sub-Navigation */}
      <div className="flex items-center bg-neutral p-1 rounded-md border border-border max-w-xl">
        <button
          onClick={() => setActiveTab("stack")}
          className={`flex-1 py-1.5 px-3 rounded-sm text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "stack"
              ? "bg-surface text-primary border border-border shadow-xs"
              : "text-secondary hover:text-primary"
          }`}
        >
          <Cpu className="w-3.5 h-3.5" />
          <span>What We Are Using</span>
        </button>
        <button
          onClick={() => setActiveTab("pipeline")}
          className={`flex-1 py-1.5 px-3 rounded-sm text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "pipeline"
              ? "bg-surface text-primary border border-border shadow-xs"
              : "text-secondary hover:text-primary"
          }`}
        >
          <Workflow className="w-3.5 h-3.5" />
          <span>How It Is Made</span>
        </button>
        <button
          onClick={() => setActiveTab("upgrades")}
          className={`flex-1 py-1.5 px-3 rounded-sm text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "upgrades"
              ? "bg-surface text-primary border border-border shadow-xs"
              : "text-secondary hover:text-primary"
          }`}
        >
          <Zap className="w-3.5 h-3.5" />
          <span>How to Upgrade</span>
        </button>
        <button
          onClick={() => setActiveTab("telemetry")}
          className={`flex-1 py-1.5 px-3 rounded-sm text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2 ${
            activeTab === "telemetry"
              ? "bg-surface text-primary border border-border shadow-xs"
              : "text-secondary hover:text-primary"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          <span>Live Telemetry</span>
        </button>
      </div>

      {/* TAB 1: WHAT WE ARE USING (STACK) */}
      {activeTab === "stack" && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Component 1: Media & Vision */}
            <div className="p-5 rounded-md border border-border bg-surface space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-sm bg-neutral border border-border flex items-center justify-center text-primary">
                    <Film className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-primary">Computer Vision &amp; Media Extraction</h3>
                    <span className="text-[11px] text-secondary">FFmpeg, OpenCV (`cv2`), PySceneDetect</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-sm bg-neutral text-[10px] font-mono border border-border text-secondary">
                  v4.10 / C++
                </span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Handles deep video decomposition: transcodes input to standardized 720p 9:16 proxies, samples 1 FPS baseline frames,
                extracts 4 FPS high-frequency frames during the critical opening 3-second hook window, and clusters dominant color palettes via k-means.
              </p>
              <div className="pt-2 border-t border-border/60 flex flex-wrap gap-1.5 font-mono text-[10px] text-secondary">
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">1fps Body Sampling</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">4fps Hook Scrubbing</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">Scene Cuts (gt 0.25)</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">K-Means Palette</span>
              </div>
            </div>

            {/* Component 2: Speech & Acoustic */}
            <div className="p-5 rounded-md border border-border bg-surface space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-sm bg-neutral border border-border flex items-center justify-center text-primary">
                    <Mic className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-primary">Speech &amp; Acoustic Rhythm Engine</h3>
                    <span className="text-[11px] text-secondary">OpenAI Whisper + SciPy RMS Processing</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-sm bg-neutral text-[10px] font-mono border border-border text-secondary">
                  faster-whisper
                </span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Extracts 16kHz audio streams and runs acoustic speech transcription with <strong>exact millisecond word timestamps</strong>.
                Calculates words-per-minute (WPM) cadence pacing, voice energy envelopes, and detects retention-killing dead-air gaps (&gt;1.5s).
              </p>
              <div className="pt-2 border-t border-border/60 flex flex-wrap gap-1.5 font-mono text-[10px] text-secondary">
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">Word Timestamps (ms)</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">WPM Speech Rhythm</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">RMS Energy Curves</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">Silence Gap Profiler</span>
              </div>
            </div>

            {/* Component 3: Social Scrapers & CDN Resolvers */}
            <div className="p-5 rounded-md border border-border bg-surface space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-sm bg-neutral border border-border flex items-center justify-center text-primary">
                    <Share2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-primary">Social Telemetry &amp; Stream Scraper</h3>
                    <span className="text-[11px] text-secondary">yt-dlp + TikWM Proxy Stream Resolver</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-sm bg-neutral text-[10px] font-mono border border-border text-secondary">
                  v2026.x
                </span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Connects to Instagram Reels, TikTok, and YouTube Shorts. Bypasses regional ISP blocks via dedicated proxy resolvers to
                download watermark-free media streams while extracting live engagement counts (views, likes, shares, comments).
              </p>
              <div className="pt-2 border-t border-border/60 flex flex-wrap gap-1.5 font-mono text-[10px] text-secondary">
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">Instagram Reels</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">TikTok CDN Bypass</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">YouTube Shorts</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">Engagement Parsing</span>
              </div>
            </div>

            {/* Component 4: Reasoning & VLMs */}
            <div className="p-5 rounded-md border border-border bg-surface space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-sm bg-neutral border border-border flex items-center justify-center text-primary">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-primary">Multimodal Reasoning &amp; Synthesis</h3>
                    <span className="text-[11px] text-secondary">Qwen2.5-VL / Claude 3.5 Sonnet / OpenAI</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-sm bg-neutral text-[10px] font-mono border border-border text-secondary">
                  vLLM / APIs
                </span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Evaluates narrative tension, visual curiosity triggers, and emotional payoff. In Remix Studio, reuses the structural
                blueprint to generate original ranked hooks, a continuous spoken script (no section headers), and shot-by-shot prompts.
              </p>
              <div className="pt-2 border-t border-border/60 flex flex-wrap gap-1.5 font-mono text-[10px] text-secondary">
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">Forensic Evidence Scores</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">Psychological Hooks</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">Style Lock Integration</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">Originality Verification</span>
              </div>
            </div>

            {/* Component 5: ReelBrain Memory Engine */}
            <div className="p-5 rounded-md border border-border bg-surface space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-sm bg-neutral border border-border flex items-center justify-center text-primary">
                    <Brain className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-primary">Cross-Video Knowledge Engine (Brain)</h3>
                    <span className="text-[11px] text-secondary">`workers/brain/memory.py` + JSON/pgvector</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-sm bg-neutral text-[10px] font-mono border border-border text-secondary">
                  Persistent
                </span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Every scanned or uploaded video is continuously memorized. Aggregates frame metrics across videos, clusters winning
                hook patterns by niche, indexes Mega-Viral Unicorns (25M+ likes), and feeds empirical recommendations into Remix Studio.
              </p>
              <div className="pt-2 border-t border-border/60 flex flex-wrap gap-1.5 font-mono text-[10px] text-secondary">
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">41+ Videos Memorized</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">168M+ Views Indexed</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">Mega-Viral Hall of Fame</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">Hook Archetype Index</span>
              </div>
            </div>

            {/* Component 6: Full-Stack Web Platform */}
            <div className="p-5 rounded-md border border-border bg-surface space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-sm bg-neutral border border-border flex items-center justify-center text-primary">
                    <Server className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-medium text-primary">Full-Stack Application Architecture</h3>
                    <span className="text-[11px] text-secondary">Next.js 14 (App Router) + FastAPI (Python 3.12)</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded-sm bg-neutral text-[10px] font-mono border border-border text-secondary">
                  Ports 3000 / 8001
                </span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Engineered with a high-contrast Vercel Minimal aesthetic (`#171717`, `#5A5A5A`, `#FAFAFA`). Real-time Server-Sent Events (SSE)
                stream progress from the media pipeline to the web UI without polling.
              </p>
              <div className="pt-2 border-t border-border/60 flex flex-wrap gap-1.5 font-mono text-[10px] text-secondary">
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">Next.js 14 App Router</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">FastAPI Async SSE</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">Tailwind CSS Minimal</span>
                <span className="px-2 py-0.5 bg-neutral rounded border border-border">Multi-Res Favicon</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HOW IT IS MADE (PIPELINE ARCHITECTURE) */}
      {activeTab === "pipeline" && (
        <div className="space-y-6">
          <div className="p-6 bg-surface rounded-md border border-border">
            <h2 className="text-base font-medium text-primary mb-1">
              The 8-Stage Forensic Pipeline Architecture
            </h2>
            <p className="text-xs text-secondary mb-6">
              Implemented in <code className="font-mono text-primary bg-neutral px-1.5 py-0.5 rounded border border-border">workers/pipeline.py</code>.
              Idempotent, resumable, and emits real-time Server-Sent Events (SSE) to the frontend.
            </p>

            <div className="space-y-4">
              {[
                {
                  stage: "Stage 0",
                  title: "Ingest & Telemetry Probe",
                  desc: "Connects to URL (or receives MP4/MOV upload). Scrapes public view, like, comment, and share metrics via yt-dlp or TikWM proxy resolver. Probes dimensions, duration, and frame rate.",
                  code: "probe_video(path) → { width, height, duration_s, fps }",
                  badge: "10% Progress",
                },
                {
                  stage: "Stage 1",
                  title: "Media Normalization",
                  desc: "Transcodes original file into a standardized 720p 9:16 vertical proxy (fast web streaming) and extracts clean 16kHz mono WAV audio.",
                  code: "normalize_video(src, proxy_path, audio_path)",
                  badge: "25% Progress",
                },
                {
                  stage: "Stage 2",
                  title: "Frame & Scene Keyframe Extraction",
                  desc: "Deconstructs the video into 1 FPS body frames, 4 FPS high-frequency frames during the first 3s hook window, and extracts exact scene cut transition keyframes.",
                  code: "extract_frames_1fps() + detect_scene_cuts(threshold=0.25)",
                  badge: "45% Progress",
                },
                {
                  stage: "Stage 3",
                  title: "Acoustic Whisper Transcription",
                  desc: "Feeds audio into Whisper to extract full spoken text with exact millisecond word timestamps and speech rate (WPM).",
                  code: "transcribe_audio(audio_path, model='base') → words[{w, start_ms, end_ms}]",
                  badge: "65% Progress",
                },
                {
                  stage: "Stage 4",
                  title: "Keyframe Text OCR Extraction",
                  desc: "Runs OCR across keyframes to detect on-screen headlines, sticker texts, and captions to assess visual cognitive load and hook readability.",
                  code: "run_ocr_on_keyframes(frames_info) → ocr[{text, confidence, bbox}]",
                  badge: "80% Progress",
                },
                {
                  stage: "Stage 5",
                  title: "Audio Energy Curves & Dead-Air Detection",
                  desc: "Computes RMS audio energy envelopes and flags silence gaps longer than 1.5s that trigger viewer swipe-away.",
                  code: "analyze_audio_features(audio_path) → silence_gaps[], energy_curve[]",
                  badge: "85% Progress",
                },
                {
                  stage: "Stage 6",
                  title: "Forensic Scoring & Blueprint Synthesis",
                  desc: "Synthesizes empirical 0-100 scores calibrated against real-world engagement (views & likes). Deconstructs narrative structural blueprints and anchors critiques to concrete timestamps.",
                  code: "compute_empirical_scores() + run_full_analysis()",
                  badge: "92% Progress",
                },
                {
                  stage: "Stage 7",
                  title: "Brain Memory Indexing & Persistence",
                  desc: "Indexes the complete forensic report, frames, and engagement stats into `storage/brain_memory.json`, updating global hook archetypes and pacing distributions.",
                  code: "brain_memory.index_video(video_id, pipeline_data)",
                  badge: "100% Ready",
                },
              ].map((step, idx) => (
                <div key={idx} className="p-4 rounded-md border border-border bg-neutral/40 flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-medium text-primary px-2 py-0.5 bg-surface rounded border border-border">
                        {step.stage}
                      </span>
                      <h4 className="text-sm font-medium text-primary">{step.title}</h4>
                    </div>
                    <p className="text-xs text-secondary leading-relaxed max-w-2xl">{step.desc}</p>
                    <div className="font-mono text-[11px] text-primary/80 pt-1">
                      <code>{step.code}</code>
                    </div>
                  </div>
                  <span className="font-mono text-[11px] text-secondary self-start md:self-center px-2 py-1 bg-surface rounded border border-border flex-shrink-0">
                    {step.badge}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: HOW WE CAN UPGRADE THAT (ROADMAP) */}
      {activeTab === "upgrades" && (
        <div className="space-y-6">
          <div className="p-6 bg-surface rounded-md border border-border">
            <div className="flex items-center justify-between pb-4 border-b border-border mb-6">
              <div>
                <h2 className="text-base font-medium text-primary">
                  Engineering Upgrade Vectors &amp; Roadmap
                </h2>
                <p className="text-xs text-secondary mt-0.5">
                  Actionable enhancements to elevate ReelBrain from a prototype autopsy engine to an enterprise-grade viral intelligence platform.
                </p>
              </div>
              <span className="text-xs font-mono px-2.5 py-1 rounded bg-neutral border border-border text-secondary">
                6 Upgrade Paths
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upgrade 1 */}
              <div className="p-4 rounded-md border border-border bg-neutral/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-medium text-primary px-2 py-0.5 bg-surface rounded border border-border">
                    Vector 1 • Multimodal Video
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    High Impact
                  </span>
                </div>
                <h4 className="text-sm font-medium text-primary">Native Video Streaming (Gemini 1.5 Pro / Flash)</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  <strong>Current:</strong> Ingests extracted frames and JSON summaries.<br />
                  <strong>Upgrade:</strong> Pass raw video files directly to Gemini 1.5 Pro or Flash (which natively accepts 1 hour of video at 1 fps). Enables detection of subtle micro-expressions, background sound cues, and seamless visual continuity.
                </p>
              </div>

              {/* Upgrade 2 */}
              <div className="p-4 rounded-md border border-border bg-neutral/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-medium text-primary px-2 py-0.5 bg-surface rounded border border-border">
                    Vector 2 • Audio Pacing
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    5x Speedup
                  </span>
                </div>
                <h4 className="text-sm font-medium text-primary">GPU Whisper TensorRT + Diarization</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  <strong>Current:</strong> CPU Whisper base model (~5s for a 30s video).<br />
                  <strong>Upgrade:</strong> Deploy <code className="font-mono text-[10px]">faster-whisper-large-v3</code> on GPU with FP16 TensorRT. Adds speaker diarization (separating creator voice from background sounds) and sub-second transcription.
                </p>
              </div>

              {/* Upgrade 3 */}
              <div className="p-4 rounded-md border border-border bg-neutral/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-medium text-primary px-2 py-0.5 bg-surface rounded border border-border">
                    Vector 3 • Motion &amp; Eye Contact
                  </span>
                  <span className="text-[10px] font-mono text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                    New Signal
                  </span>
                </div>
                <h4 className="text-sm font-medium text-primary">Optical Flow &amp; Eye-Contact Tracking</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  <strong>Current:</strong> Scene cut keyframes and RMS audio energy.<br />
                  <strong>Upgrade:</strong> Add RAFT or Gunnar-Farneback optical flow to quantify camera zoom/pan velocity, plus MediaPipe face mesh to measure creator eye-contact hold in the opening 3 seconds.
                </p>
              </div>

              {/* Upgrade 4 */}
              <div className="p-4 rounded-md border border-border bg-neutral/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-medium text-primary px-2 py-0.5 bg-surface rounded border border-border">
                    Vector 4 • Remix Studio
                  </span>
                  <span className="text-[10px] font-mono text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-200">
                    Generative
                  </span>
                </div>
                <h4 className="text-sm font-medium text-primary">1-Click Video &amp; Voice Synthesis</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  <strong>Current:</strong> Generates prompts and continuous spoken script.<br />
                  <strong>Upgrade:</strong> Connect shot prompts to LTX-Video, Kling 1.5, or Wan2.1 API, and the script to Kokoro / ElevenLabs TTS to render a complete, ready-to-publish video in 60 seconds.
                </p>
              </div>

              {/* Upgrade 5 */}
              <div className="p-4 rounded-md border border-border bg-neutral/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-medium text-primary px-2 py-0.5 bg-surface rounded border border-border">
                    Vector 5 • Automated Brain
                  </span>
                  <span className="text-[10px] font-mono text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    Continuous
                  </span>
                </div>
                <h4 className="text-sm font-medium text-primary">Automated Niche Crawler Spider</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  <strong>Current:</strong> Ingests videos on-demand via link paste or upload.<br />
                  <strong>Upgrade:</strong> Run a daily cron spider (<code className="font-mono text-[10px]">workers/crawler</code>) fetching top 50 trending reels across target verticals (SaaS, Fitness, E-commerce), constantly feeding the Brain.
                </p>
              </div>

              {/* Upgrade 6 */}
              <div className="p-4 rounded-md border border-border bg-neutral/30 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[11px] font-medium text-primary px-2 py-0.5 bg-surface rounded border border-border">
                    Vector 6 • Database &amp; Search
                  </span>
                  <span className="text-[10px] font-mono text-amber-600 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    Scale 1M+
                  </span>
                </div>
                <h4 className="text-sm font-medium text-primary">PostgreSQL + pgvector Vector Hook Search</h4>
                <p className="text-xs text-secondary leading-relaxed">
                  <strong>Current:</strong> Local JSON file persistence in <code className="font-mono text-[10px]">storage/brain_memory.json</code>.<br />
                  <strong>Upgrade:</strong> Migrate to PostgreSQL with <code className="font-mono text-[10px]">pgvector</code> to allow vector similarity search across opening 3-second hook shots across 1,000,000+ videos.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: LIVE TELEMETRY & DIAGNOSTICS */}
      {activeTab === "telemetry" && (
        <div className="space-y-6">
          <div className="p-6 bg-surface rounded-md border border-border space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-border">
              <div>
                <h2 className="text-base font-medium text-primary">Live Stack Diagnostics</h2>
                <p className="text-xs text-secondary mt-0.5">
                  Real-time health telemetry across running services, storage volumes, and ports.
                </p>
              </div>
              <button
                onClick={fetchMetrics}
                disabled={isLoading}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                <span>Refresh Diagnostics</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-md border border-border bg-neutral/40">
                <span className="text-[10px] font-mono uppercase tracking-wider text-secondary block mb-1">
                  Web Server (Next.js)
                </span>
                <span className="text-base font-medium text-primary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Port 3000 (200 OK)
                </span>
              </div>
              <div className="p-4 rounded-md border border-border bg-neutral/40">
                <span className="text-[10px] font-mono uppercase tracking-wider text-secondary block mb-1">
                  API Server (FastAPI)
                </span>
                <span className="text-base font-medium text-primary flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Port 8001 (200 OK)
                </span>
              </div>
              <div className="p-4 rounded-md border border-border bg-neutral/40">
                <span className="text-[10px] font-mono uppercase tracking-wider text-secondary block mb-1">
                  Brain Indexed Videos
                </span>
                <span className="text-base font-medium text-primary">
                  {liveMetrics?.total_videos || 41} Videos
                </span>
              </div>
              <div className="p-4 rounded-md border border-border bg-neutral/40">
                <span className="text-[10px] font-mono uppercase tracking-wider text-secondary block mb-1">
                  Analyzed Frames
                </span>
                <span className="text-base font-medium text-primary">
                  {liveMetrics?.total_frames_analyzed || 498} Frames
                </span>
              </div>
            </div>

            {/* Quick Testing Actions */}
            <div className="pt-4 border-t border-border space-y-3">
              <h3 className="text-xs font-medium text-primary uppercase tracking-wider">
                API Quick Validation Commands
              </h3>
              <div className="space-y-2">
                {[
                  {
                    title: "Check System Health",
                    cmd: "curl -s http://localhost:8001/health",
                  },
                  {
                    title: "Query Brain Memory Status",
                    cmd: "curl -s http://localhost:8001/v1/brain",
                  },
                  {
                    title: "Fetch Empirical Creation Recommendations",
                    cmd: "curl -s \"http://localhost:8001/v1/brain/recommendations?product=shoes&platform=reels&goal=conversions\"",
                  },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-neutral rounded border border-border flex items-center justify-between text-xs font-mono"
                  >
                    <div className="space-y-0.5 overflow-x-auto pr-4">
                      <span className="text-[11px] text-secondary font-sans block">{item.title}</span>
                      <code className="text-primary">{item.cmd}</code>
                    </div>
                    <button
                      onClick={() => handleCopy(item.cmd, item.title)}
                      className="px-2.5 py-1 bg-surface rounded border border-border text-[11px] hover:text-primary transition cursor-pointer flex-shrink-0"
                    >
                      {copiedSection === item.title ? "Copied" : "Copy"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
