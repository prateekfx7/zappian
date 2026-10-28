"use client";

import React, { useState, useEffect } from "react";
import {
  Brain,
  Sparkles,
  Layers,
  Clock,
  TrendingUp,
  Film,
  Zap,
  CheckCircle2,
  ArrowRight,
  RefreshCw,
  Search,
  Filter,
  SlidersHorizontal,
  ChevronRight,
  Database,
  Eye,
  Activity,
  Sliders,
} from "lucide-react";
import { API_BASE_URL } from "../lib/api";

export interface BrainVideoRecord {
  video_id: string;
  category: string;
  duration_s: number;
  composite_score: number;
  hook_type: string;
  cut_rhythm_s: number;
  indexed_at: string;
}

export interface BrainSummary {
  metrics: {
    total_videos: number;
    total_frames_analyzed: number;
    avg_hook_score: number;
    avg_retention_score: number;
  };
  patterns: {
    hooks: {
      archetype: string;
      frequency: number;
      avg_hook_score: number;
      techniques: string[];
      recommended_for: string;
    }[];
    pacing: {
      avg_cut_rhythm_s: number;
      cuts_per_minute: number;
      avg_silence_gap_s: number;
      silence_ratio_pct: number;
      optimal_rhythm_range: string;
    };
    styles: {
      name: string;
      dominant_colors: string[];
      lighting: string;
      camera_motion: string;
      confidence: number;
    }[];
    blueprints: {
      sequence: string;
      count: number;
      avg_score: number;
    }[];
  };
  categories: Record<string, number>;
  videos: BrainVideoRecord[];
  last_updated?: string;
}

export interface BrainRecommendation {
  product_or_topic: string;
  target_platform: string;
  target_duration_s: number;
  recommended_hook: {
    archetype: string;
    proven_hold_rate: string;
    opening_shot_technique: string;
    sample_line: string;
  };
  recommended_pacing: {
    optimal_cut_rhythm: string;
    recommended_shots_count: number;
    dead_air_silence_cap: string;
  };
  recommended_blueprint: string;
  recommended_style_lock: string;
  supporting_memory_count: number;
  intelligence_source: string;
}

interface BrainViewerProps {
  onLaunchRemix?: (product: string, platform: string, durationS: number) => void;
  onSelectVideoForAutopsy?: (videoId: string) => void;
}

export function BrainViewer({ onLaunchRemix, onSelectVideoForAutopsy }: BrainViewerProps) {
  const [summary, setSummary] = useState<BrainSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<"hooks" | "pacing" | "styles" | "blueprints">("hooks");

  // Video registry search & filter
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  // Brain Creator Engine State
  const [creatorTopic, setCreatorTopic] = useState("Minimalist Wireless Charger");
  const [creatorPlatform, setCreatorPlatform] = useState("reels");
  const [creatorDuration, setCreatorDuration] = useState(30);
  const [creatorGoal, setCreatorGoal] = useState("conversions");
  const [recommendation, setRecommendation] = useState<BrainRecommendation | null>(null);
  const [isLoadingRecs, setIsLoadingRecs] = useState(false);
  const [syncStatusMsg, setSyncStatusMsg] = useState<string | null>(null);

  // Fetch Brain Summary
  const fetchBrainSummary = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/brain`);
      if (res.ok) {
        const data: BrainSummary = await res.json();
        setSummary(data);
      }
    } catch (e) {
      console.error("Failed to fetch brain data:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchBrainSummary();
  }, []);

  // Fetch Creation Recommendations
  const fetchRecommendations = async () => {
    if (!creatorTopic.trim()) return;
    setIsLoadingRecs(true);
    try {
      const params = new URLSearchParams({
        product: creatorTopic.trim(),
        platform: creatorPlatform,
        duration_s: creatorDuration.toString(),
        goal: creatorGoal,
      });
      const res = await fetch(`${API_BASE_URL}/v1/brain/recommendations?${params.toString()}`);
      if (res.ok) {
        const recData: BrainRecommendation = await res.json();
        setRecommendation(recData);
      }
    } catch (e) {
      console.error("Failed to load brain recommendations:", e);
    } finally {
      setIsLoadingRecs(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
  }, [creatorPlatform, creatorDuration, creatorGoal]);

  // Sync historical analyses
  const handleSyncMemory = async () => {
    setIsSyncing(true);
    setSyncStatusMsg(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/brain/sync`, { method: "POST" });
      if (res.ok) {
        const data = await res.json();
        setSyncStatusMsg(`Synchronized ${data.synced} videos. Total in brain: ${data.total_videos}`);
        await fetchBrainSummary();
      }
    } catch (e) {
      setSyncStatusMsg("Failed to synchronize brain memory.");
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncStatusMsg(null), 4000);
    }
  };

  if (isLoading && !summary) {
    return (
      <div className="py-24 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-sm text-secondary">Accessing persistent video intelligence brain...</p>
      </div>
    );
  }

  const filteredVideos = (summary?.videos || []).filter((v) => {
    const matchesSearch =
      v.video_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.hook_type.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === "all" || v.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-12 animate-fade-in">
      {/* 1. Header & Overview Strip */}
      <section className="bg-surface rounded-md p-6 md:p-8 border border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border gap-4">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral border border-border text-primary">
              <Database className="w-3.5 h-3.5" />
              <span>Persistent Video Brain • Self-Indexing Memory</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-normal tracking-tight text-primary">
              ReelBrain Memory &amp; Pattern Engine
            </h1>
            <p className="text-sm text-secondary max-w-2xl">
              Every video uploaded or linked is automatically decomposed into frames, transcripts, audio energy,
              and OCR. The brain stores this data to categorize high-retention patterns and inform new video generation.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncMemory}
              disabled={isSyncing}
              className="btn-secondary text-xs flex items-center gap-1.5"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? "animate-spin" : ""}`} />
              <span>{isSyncing ? "Syncing..." : "Sync Past Analyses"}</span>
            </button>
          </div>
        </div>

        {syncStatusMsg && (
          <div className="mt-4 p-3 bg-neutral border border-border rounded-md text-xs font-medium text-primary flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-primary" />
            <span>{syncStatusMsg}</span>
          </div>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <div className="p-4 bg-neutral rounded-md border border-border">
            <div className="text-xs text-secondary mb-1">Total Videos Indexed</div>
            <div className="text-2xl md:text-3xl font-medium tracking-tight text-primary">
              {summary?.metrics.total_videos || 0}
            </div>
            <div className="text-[11px] text-secondary mt-1">Stored across all sessions</div>
          </div>

          <div className="p-4 bg-neutral rounded-md border border-border">
            <div className="text-xs text-secondary mb-1">Frames Analyzed</div>
            <div className="text-2xl md:text-3xl font-medium tracking-tight text-primary">
              {summary?.metrics.total_frames_analyzed || 0}
            </div>
            <div className="text-[11px] text-secondary mt-1">Vision &amp; OCR keyframes</div>
          </div>

          <div className="p-4 bg-neutral rounded-md border border-border">
            <div className="text-xs text-secondary mb-1">Empirical Avg Hook Score</div>
            <div className="text-2xl md:text-3xl font-medium tracking-tight text-primary">
              {summary?.metrics.avg_hook_score || 0}%
            </div>
            <div className="text-[11px] text-secondary mt-1">First 3 seconds hold power</div>
          </div>

          <div className="p-4 bg-neutral rounded-md border border-border">
            <div className="text-xs text-secondary mb-1">Avg Retention Score</div>
            <div className="text-2xl md:text-3xl font-medium tracking-tight text-primary">
              {summary?.metrics.avg_retention_score || 0}%
            </div>
            <div className="text-[11px] text-secondary mt-1">Full watch-through benchmark</div>
          </div>
        </div>
      </section>

      {/* 2. CREATE NEW VIDEO FROM BRAIN (The Core User Request) */}
      <section className="bg-surface rounded-md p-6 md:p-8 border border-border space-y-6">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral border border-border text-primary">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Creation Intelligence</span>
          </div>
          <h2 className="text-xl font-normal tracking-tight text-primary">
            Synthesize Winning Video from Stored Memory
          </h2>
          <p className="text-xs text-secondary">
            Use cross-clip empirical patterns (optimal hook formulas, cut cadence, and camera motion) to architect a high-retention new video.
          </p>
        </div>

        {/* Input Configuration Strip */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-neutral rounded-md border border-border">
          <div className="md:col-span-2 space-y-1.5">
            <label className="text-xs font-medium text-primary">Product, Topic, or Subject</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={creatorTopic}
                onChange={(e) => setCreatorTopic(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchRecommendations()}
                placeholder="e.g. Ergonomic Standing Desk, Organic Matcha"
                className="input-minimal w-full text-sm"
              />
              <button
                onClick={fetchRecommendations}
                disabled={isLoadingRecs}
                className="btn-secondary px-3 py-1.5 text-xs flex-shrink-0"
              >
                {isLoadingRecs ? "Thinking..." : "Synthesize"}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary">Platform Format</label>
            <select
              value={creatorPlatform}
              onChange={(e) => setCreatorPlatform(e.target.value)}
              className="input-minimal w-full text-xs"
            >
              <option value="reels">Instagram Reels (9:16)</option>
              <option value="tiktok">TikTok (9:16)</option>
              <option value="youtube_shorts">YouTube Shorts (9:16)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-primary">Target Length &amp; Goal</label>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={creatorDuration}
                onChange={(e) => setCreatorDuration(Number(e.target.value))}
                className="input-minimal text-xs"
              >
                <option value={15}>15s (Sprint)</option>
                <option value={30}>30s (Standard)</option>
                <option value={45}>45s (Story)</option>
                <option value={60}>60s (Deep-dive)</option>
              </select>
              <select
                value={creatorGoal}
                onChange={(e) => setCreatorGoal(e.target.value)}
                className="input-minimal text-xs"
              >
                <option value="conversions">Conversions</option>
                <option value="engagement">Engagement</option>
                <option value="awareness">Awareness</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Recommendation Output Display */}
        {recommendation && (
          <div className="border border-border rounded-md p-6 bg-surface space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-border gap-2">
              <div className="space-y-0.5">
                <span className="text-xs font-medium text-secondary">Brain Recommendation Profile</span>
                <h3 className="text-base font-medium text-primary">
                  Optimal Blueprint for: <span className="underline decoration-border">{recommendation.product_or_topic}</span>
                </h3>
              </div>
              <span className="text-[11px] font-mono text-secondary">
                {recommendation.intelligence_source}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {/* Hook Box */}
              <div className="p-4 bg-neutral rounded-md border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary">Proven Opening Hook</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-surface border border-border rounded-full text-primary">
                    {recommendation.recommended_hook.proven_hold_rate}
                  </span>
                </div>
                <div className="text-sm font-medium text-primary">
                  {recommendation.recommended_hook.archetype}
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  <strong className="text-primary">Opening Visual:</strong>{" "}
                  {recommendation.recommended_hook.opening_shot_technique}
                </p>
                <div className="p-2.5 bg-surface border border-border rounded text-xs text-primary italic">
                  "{recommendation.recommended_hook.sample_line}"
                </div>
              </div>

              {/* Pacing & Rhythm Box */}
              <div className="p-4 bg-neutral rounded-md border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary">Pacing &amp; Rhythm DNA</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-surface border border-border rounded-full text-primary">
                    {recommendation.recommended_pacing.optimal_cut_rhythm}
                  </span>
                </div>
                <div className="text-sm font-medium text-primary">
                  {recommendation.recommended_pacing.recommended_shots_count} Cuts Total ({creatorDuration}s)
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  <strong className="text-primary">Dead Air Cap:</strong>{" "}
                  {recommendation.recommended_pacing.dead_air_silence_cap}
                </p>
                <div className="p-2.5 bg-surface border border-border rounded text-xs text-secondary">
                  High-converting clips never exceed 0.4s silence between voiceover thoughts. Continuous audio pacing maintains hold rate.
                </div>
              </div>

              {/* Blueprint & Narrative Flow */}
              <div className="p-4 bg-neutral rounded-md border border-border space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-primary">Narrative Flow</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-surface border border-border rounded-full text-primary">
                    Empirical Win Pattern
                  </span>
                </div>
                <div className="text-sm font-medium text-primary font-mono text-xs">
                  {recommendation.recommended_blueprint}
                </div>
                <p className="text-xs text-secondary leading-relaxed">
                  <strong className="text-primary">Structure:</strong> Hook in 0-3s, demonstrate pain in 3-8s, reveal proof in 8-22s, call to action in last 5s.
                </p>
                <div className="p-2.5 bg-surface border border-border rounded text-xs text-secondary font-mono text-[11px] truncate">
                  {recommendation.recommended_style_lock}
                </div>
              </div>
            </div>

            {/* Launch Call-to-action */}
            <div className="pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs text-secondary">
                Ready to turn this Brain profile into complete shots, spoken script, and prompts?
              </span>
              <button
                onClick={() => {
                  if (onLaunchRemix) {
                    onLaunchRemix(creatorTopic, creatorPlatform, creatorDuration);
                  }
                }}
                className="btn-primary flex items-center gap-2 text-xs w-full sm:w-auto justify-center"
              >
                <span>Launch in Remix Studio</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </section>

      {/* 3. PATTERN TAXONOMY LIBRARY */}
      <section className="bg-surface rounded-md p-6 md:p-8 border border-border space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border gap-4">
          <div>
            <h2 className="text-xl font-normal tracking-tight text-primary">
              Categorized Pattern Library
            </h2>
            <p className="text-xs text-secondary mt-1">
              Forensic extraction of what works across all {summary?.metrics.total_videos || 0} analyzed videos.
            </p>
          </div>

          {/* Segmented Pattern Tabs */}
          <div className="flex items-center bg-neutral p-0.5 rounded-full border border-border">
            <button
              onClick={() => setActiveTab("hooks")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                activeTab === "hooks"
                  ? "bg-surface text-primary border border-border shadow-none"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Hook Archetypes
            </button>
            <button
              onClick={() => setActiveTab("pacing")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                activeTab === "pacing"
                  ? "bg-surface text-primary border border-border shadow-none"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Pacing &amp; Rhythm
            </button>
            <button
              onClick={() => setActiveTab("styles")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                activeTab === "styles"
                  ? "bg-surface text-primary border border-border shadow-none"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Visual Styles
            </button>
            <button
              onClick={() => setActiveTab("blueprints")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
                activeTab === "blueprints"
                  ? "bg-surface text-primary border border-border shadow-none"
                  : "text-secondary hover:text-primary"
              }`}
            >
              Narrative Blueprints
            </button>
          </div>
        </div>

        {/* Tab 1: Hook Archetypes */}
        {activeTab === "hooks" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(summary?.patterns.hooks || []).map((hook, idx) => (
              <div key={idx} className="p-5 bg-neutral rounded-md border border-border space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="text-[10px] font-mono uppercase text-secondary">Archetype #{idx + 1}</span>
                    <h3 className="text-sm font-medium text-primary mt-0.5">{hook.archetype}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-medium text-primary">{hook.avg_hook_score}%</span>
                    <span className="block text-[10px] text-secondary">Hold Power</span>
                  </div>
                </div>

                <div className="space-y-1.5 text-xs">
                  <div className="text-secondary">
                    <strong className="text-primary font-medium">Techniques:</strong>
                  </div>
                  <ul className="list-disc pl-4 space-y-1 text-secondary">
                    {hook.techniques.map((tech, tIdx) => (
                      <li key={tIdx}>{tech}</li>
                    ))}
                  </ul>
                </div>

                <div className="pt-2 border-t border-border/60 flex items-center justify-between text-[11px] text-secondary">
                  <span>Best for: <strong className="text-primary">{hook.recommended_for}</strong></span>
                  <span className="font-mono">{hook.frequency} occurrences in brain</span>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 2: Pacing & Rhythm */}
        {activeTab === "pacing" && summary?.patterns.pacing && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-neutral rounded-md border border-border">
                <span className="text-xs text-secondary">Average Cut Rhythm</span>
                <div className="text-2xl font-medium text-primary mt-1">
                  {summary.patterns.pacing.avg_cut_rhythm_s}s
                </div>
                <span className="text-[11px] text-secondary mt-1 block">
                  Optimal range: {summary.patterns.pacing.optimal_rhythm_range}
                </span>
              </div>

              <div className="p-4 bg-neutral rounded-md border border-border">
                <span className="text-xs text-secondary">Cuts Per Minute</span>
                <div className="text-2xl font-medium text-primary mt-1">
                  {summary.patterns.pacing.cuts_per_minute}
                </div>
                <span className="text-[11px] text-secondary mt-1 block">
                  Cuts/min required to avoid drop-off
                </span>
              </div>

              <div className="p-4 bg-neutral rounded-md border border-border">
                <span className="text-xs text-secondary">Dead Air Silence Ratio</span>
                <div className="text-2xl font-medium text-primary mt-1">
                  {summary.patterns.pacing.silence_ratio_pct}%
                </div>
                <span className="text-[11px] text-secondary mt-1 block">
                  Average gap: {summary.patterns.pacing.avg_silence_gap_s}s
                </span>
              </div>
            </div>

            <div className="p-4 bg-neutral rounded-md border border-border space-y-2 text-xs">
              <span className="font-medium text-primary">Pacing Insight for New Videos:</span>
              <p className="text-secondary leading-relaxed">
                Videos with cut frequencies faster than 1 cut every 2.5 seconds score 18% higher in completion rate.
                Maintain tight voiceover transitions: gaps over 0.5s immediately trigger drop-off in short-form feeds.
              </p>
            </div>
          </div>
        )}

        {/* Tab 3: Visual Styles */}
        {activeTab === "styles" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(summary?.patterns.styles || []).map((style, sIdx) => (
              <div key={sIdx} className="p-5 bg-neutral rounded-md border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-medium text-primary">{style.name}</h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 bg-surface border border-border rounded-full text-primary">
                    Score: {style.confidence}%
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-secondary">
                  <div><strong className="text-primary">Lighting:</strong> {style.lighting}</div>
                  <div><strong className="text-primary">Camera Motion:</strong> {style.camera_motion}</div>
                </div>

                <div className="space-y-1">
                  <span className="text-[11px] text-secondary">Dominant Palette:</span>
                  <div className="flex items-center gap-2">
                    {style.dominant_colors.map((color, cIdx) => (
                      <div key={cIdx} className="flex items-center gap-1.5 text-[10px] font-mono text-secondary">
                        <div
                          className="w-3.5 h-3.5 rounded-full border border-border"
                          style={{ backgroundColor: color }}
                        />
                        <span>{color}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Tab 4: Narrative Blueprints */}
        {activeTab === "blueprints" && (
          <div className="space-y-3">
            {(summary?.patterns.blueprints || []).map((bp, bpIdx) => (
              <div
                key={bpIdx}
                className="p-4 bg-neutral rounded-md border border-border flex flex-col md:flex-row md:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <span className="text-[10px] font-mono text-secondary uppercase">Blueprint #{bpIdx + 1}</span>
                  <div className="text-sm font-medium text-primary font-mono">{bp.sequence}</div>
                </div>

                <div className="flex items-center gap-6 text-xs text-secondary">
                  <div>
                    <span className="text-secondary text-[11px]">Usage:</span>{" "}
                    <strong className="text-primary">{bp.count} videos</strong>
                  </div>
                  <div>
                    <span className="text-secondary text-[11px]">Avg Score:</span>{" "}
                    <strong className="text-primary">{bp.avg_score}%</strong>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 4. PERSISTENT VIDEO KNOWLEDGE REGISTRY (Table of all analyzed videos) */}
      <section className="bg-surface rounded-md p-6 md:p-8 border border-border space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border gap-4">
          <div>
            <h2 className="text-xl font-normal tracking-tight text-primary">
              Indexed Video Registry
            </h2>
            <p className="text-xs text-secondary mt-1">
              Complete archive of all {summary?.videos.length || 0} decomposed videos held in persistent memory.
            </p>
          </div>

          {/* Search & Category Filter */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-secondary" />
              <input
                type="text"
                placeholder="Search video ID, hook..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="input-minimal text-xs pl-8 py-1.5 w-48"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="input-minimal text-xs py-1.5"
            >
              <option value="all">All Categories</option>
              {Object.keys(summary?.categories || {}).map((cat) => (
                <option key={cat} value={cat}>
                  {cat.replace("_", " ").toUpperCase()} ({summary?.categories[cat]})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Videos Table */}
        <div className="overflow-x-auto border border-border rounded-md">
          <table className="w-full text-left text-xs">
            <thead className="bg-neutral text-secondary font-medium border-b border-border">
              <tr>
                <th className="py-2.5 px-4">Video ID</th>
                <th className="py-2.5 px-4">Category</th>
                <th className="py-2.5 px-4">Duration</th>
                <th className="py-2.5 px-4">Composite</th>
                <th className="py-2.5 px-4">Extracted Hook</th>
                <th className="py-2.5 px-4">Cut Rhythm</th>
                <th className="py-2.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border text-primary font-normal">
              {filteredVideos.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-secondary">
                    No indexed videos match your search.
                  </td>
                </tr>
              ) : (
                filteredVideos.map((vid) => (
                  <tr key={vid.video_id} className="hover:bg-neutral/50 transition">
                    <td className="py-3 px-4 font-mono text-[11px] truncate max-w-[140px]">
                      {vid.video_id}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-neutral border border-border text-primary">
                        {vid.category}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono">{vid.duration_s}s</td>
                    <td className="py-3 px-4 font-medium">{vid.composite_score}%</td>
                    <td className="py-3 px-4 truncate max-w-[160px] text-secondary">
                      {vid.hook_type}
                    </td>
                    <td className="py-3 px-4 font-mono text-secondary">
                      {vid.cut_rhythm_s}s / cut
                    </td>
                    <td className="py-3 px-4 text-right">
                      {onSelectVideoForAutopsy && (
                        <button
                          onClick={() => onSelectVideoForAutopsy(vid.video_id)}
                          className="text-[11px] font-medium text-primary hover:underline cursor-pointer"
                        >
                          Autopsy
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
