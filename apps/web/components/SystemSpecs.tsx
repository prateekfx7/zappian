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
  ArrowRight,
  Terminal,
  Activity,
  Layers,
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
    <div className="max-w-4xl mx-auto space-y-10 animate-fade-in pb-16">
      {/* 1. Direct Hero (2 Lines) */}
      <div className="border-b border-border pb-6 space-y-2">
        <div className="flex items-center justify-between">
          <span className="font-mono text-xs uppercase tracking-wider text-secondary">
            ReelBrain • System &amp; API 1-Pager
          </span>
          <div className="flex items-center gap-2 font-mono text-xs text-secondary">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-primary font-medium">Live Stack</span>
            <span>•</span>
            <span>{brainStats.videos} Videos Indexed</span>
          </div>
        </div>
        <h1 className="text-2xl md:text-3xl font-normal tracking-tight text-primary">
          What is ReelBrain, how does it work, and how to use the API.
        </h1>
        <p className="text-xs md:text-sm text-secondary leading-relaxed max-w-2xl">
          ReelBrain takes any viral reel or TikTok, analyzes why it worked frame by frame,
          and generates 100% original new videos using that exact retention blueprint.
        </p>
      </div>

      {/* 2. How It Works (3 Steps) */}
      <div className="space-y-3">
        <span className="text-xs font-mono uppercase tracking-wider text-secondary block">
          01 • How It Works
        </span>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 rounded-md border border-border bg-surface space-y-1.5">
            <div className="w-6 h-6 rounded bg-neutral border border-border flex items-center justify-center font-mono text-xs text-primary font-medium">
              1
            </div>
            <h3 className="text-sm font-medium text-primary">Paste Link or Upload</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Drop any TikTok, Instagram Reel, or YouTube Shorts link. The system downloads the video
              and extracts true view/like counts.
            </p>
          </div>

          <div className="p-4 rounded-md border border-border bg-surface space-y-1.5">
            <div className="w-6 h-6 rounded bg-neutral border border-border flex items-center justify-center font-mono text-xs text-primary font-medium">
              2
            </div>
            <h3 className="text-sm font-medium text-primary">Frame-by-Frame Autopsy</h3>
            <p className="text-xs text-secondary leading-relaxed">
              AI checks the opening 3-second hook speed, voice cadence, silence gaps, and scene cuts
              to generate an empirical retention score (0–100).
            </p>
          </div>

          <div className="p-4 rounded-md border border-border bg-surface space-y-1.5">
            <div className="w-6 h-6 rounded bg-neutral border border-border flex items-center justify-center font-mono text-xs text-primary font-medium">
              3
            </div>
            <h3 className="text-sm font-medium text-primary">Remix into New Video</h3>
            <p className="text-xs text-secondary leading-relaxed">
              Enter your product or topic. It reuses the winning rhythm to write 3 hooks, a continuous
              voiceover script, and shot-by-shot prompts.
            </p>
          </div>
        </div>
      </div>

      {/* 3. What We Are Using (The 4 Core Engines) */}
      <div className="space-y-3">
        <span className="text-xs font-mono uppercase tracking-wider text-secondary block">
          02 • What We Are Using
        </span>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-4 rounded-md border border-border bg-surface flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-neutral border border-border flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
              <Film className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-primary">Video &amp; Frame Slicer</h4>
                <span className="font-mono text-[10px] text-secondary">FFmpeg + OpenCV</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Samples 1 frame/sec body + 4 frames/sec in the first 3s hook window. Finds scene cuts and extracts dominant colors.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-md border border-border bg-surface flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-neutral border border-border flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
              <Mic className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-primary">Voice &amp; Audio Pacing</h4>
                <span className="font-mono text-[10px] text-secondary">OpenAI Whisper</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Transcribes speech with exact millisecond word timestamps. Measures speaking speed (WPM) and flags awkward silence gaps.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-md border border-border bg-surface flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-neutral border border-border flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-primary">Link Scraper &amp; Proxy</h4>
                <span className="font-mono text-[10px] text-secondary">yt-dlp + TikWM Proxy</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Pulls watermark-free video streams from TikTok, Instagram Reels, and YouTube Shorts alongside verified public views and likes.
              </p>
            </div>
          </div>

          <div className="p-4 rounded-md border border-border bg-surface flex items-start gap-3">
            <div className="w-8 h-8 rounded bg-neutral border border-border flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
              <Brain className="w-4 h-4" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-medium text-primary">AI Brain &amp; Concept Writer</h4>
                <span className="font-mono text-[10px] text-secondary">Qwen / Claude / GPT</span>
              </div>
              <p className="text-xs text-secondary leading-relaxed">
                Stores patterns in memory (`storage/brain_memory.json`). Learns what makes 25M+ like videos viral and synthesizes new scripts.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Direct API Reference (How to Use It) */}
      <div className="space-y-3">
        <span className="text-xs font-mono uppercase tracking-wider text-secondary block">
          03 • Direct API Reference (Port 8001)
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
                <span className="text-secondary font-sans text-[11px]">— Analyze any video link</span>
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
                <span className="text-secondary font-sans text-[11px]">— Get winning hook &amp; script for your product</span>
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
                <span className="text-secondary font-sans text-[11px]">— View all aggregated viral memory &amp; patterns</span>
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

      {/* 5. How to Upgrade (3 Direct Upgrades) */}
      <div className="space-y-3">
        <span className="text-xs font-mono uppercase tracking-wider text-secondary block">
          04 • How to Upgrade ReelBrain
        </span>
        <div className="p-4 rounded-md border border-border bg-surface space-y-3">
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <p className="text-xs text-secondary leading-relaxed">
              <strong className="text-primary font-medium">1-Click Video Generation:</strong> Connect Remix Studio shot prompts directly to LTX-Video / Kling 1.5 API and voiceover to Kokoro / ElevenLabs to render a finished video in 60s.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <p className="text-xs text-secondary leading-relaxed">
              <strong className="text-primary font-medium">Automated Viral Spider:</strong> Add a background cron job that automatically crawls the top 50 viral TikToks daily in your niche to keep the Brain perpetually updated.
            </p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-1.5 h-1.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
            <p className="text-xs text-secondary leading-relaxed">
              <strong className="text-primary font-medium">Native Video AI (Gemini 1.5 Pro):</strong> Send raw video files directly to Gemini 1.5 Pro (which accepts 1 hour of video tokens) for micro-expression and facial eye-contact scoring.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
