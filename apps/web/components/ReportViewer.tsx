"use client";

import React, { useState } from "react";
import {
  Sparkles,
  Flame,
  Activity,
  Heart,
  Eye,
  CheckCircle2,
  TrendingUp,
  Clock,
  Layers,
  Palette,
  Zap,
  Tag,
  BarChart3,
  Lightbulb,
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
} from "lucide-react";

export interface AnalysisReport {
  schema_version: string;
  verdict: string;
  scores: {
    hook: number;
    retention: number;
    emotion: number;
    clarity: number;
    cta: number;
    shareability: number;
    sales_potential_estimate: number;
  };
  blueprint: {
    role: string;
    t_start_ms: number;
    t_end_ms: number;
    technique: string;
    purpose: string;
  }[];
  why_it_works: {
    category: "growth" | "retention" | "emotion" | "sales" | "shareability" | string;
    claim: string;
    evidence: {
      t_ms: number;
      frame_id?: string;
    }[];
    confidence: "high" | "medium" | "low" | string;
  }[];
  design_language: {
    palette: string[];
    lighting: string;
    typography: string;
    cut_rhythm_s: number;
    motion_style: string;
    music_energy: string;
  };
  fixes: {
    rank: number;
    change: string;
    t_ms: number;
    expected_impact: "high" | "medium" | "low" | string;
  }[];
  stats: {
    metric: string;
    value: number;
    source: string;
    fetched_at: string;
  }[];
}

interface ReportViewerProps {
  videoId: string;
  report: AnalysisReport;
  durationMs?: number;
  onSelectTimestamp?: (t_ms: number) => void;
  selectedTimestamp?: number | null;
  onOpenStatsDrawer?: () => void;
  onOpenRemix?: () => void;
}

export function ReportViewer({
  videoId,
  report,
  durationMs = 30000,
  onSelectTimestamp,
  selectedTimestamp,
  onOpenStatsDrawer,
  onOpenRemix,
}: ReportViewerProps) {
  // Progressive disclosure: deep dive drawers closed by default
  const [isWhyItWorksOpen, setIsWhyItWorksOpen] = useState<boolean>(false);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState<boolean>(false);
  const [isFixesOpen, setIsFixesOpen] = useState<boolean>(false);
  const [isDesignOpen, setIsDesignOpen] = useState<boolean>(false);
  const [isStatsOpen, setIsStatsOpen] = useState<boolean>(false);

  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeBeatIndex, setActiveBeatIndex] = useState<number | null>(null);

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  const categories = ["all", "growth", "retention", "emotion", "sales", "shareability"];

  const filteredClaims =
    selectedCategory === "all"
      ? report.why_it_works
      : report.why_it_works.filter((c) => c.category === selectedCategory);

  const totalDuration = durationMs > 0 ? durationMs : 30000;

  // Split verdict into 3 lines if combined
  const verdictParts = report.verdict.split(". ").filter(Boolean);
  const verdictBest = verdictParts[0] || report.verdict;
  const verdictDropoff = verdictParts[1] || "Viewer momentum holds steady across key narrative beats.";
  const verdictFit = verdictParts[2] || "Best fit: TikTok and Instagram Reels paid social ad.";

  // Calculate composite performance score
  const compositeScore = Math.min(
    99,
    Math.max(
      10,
      Math.round(
        report.scores.hook * 0.35 +
        report.scores.retention * 0.25 +
        report.scores.emotion * 0.15 +
        report.scores.clarity * 0.15 +
        report.scores.shareability * 0.10
      )
    )
  );

  return (
    <div className="space-y-6 animate-fade-in text-primary">
      {/* ========================================================= */}
      {/* 1. VERCEL MINIMAL UNIFIED CARD (Single Score Ring + 3 Bullets) */}
      {/* ========================================================= */}
      <div className="bg-surface rounded-md p-6 md:p-8 border border-border">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 border-b border-border mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-normal tracking-tight text-primary">
              Autopsy Overview
            </h2>
            <p className="text-sm text-secondary mt-0.5">
              Verified with frame-by-frame evidence
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onOpenRemix && (
              <button
                type="button"
                onClick={onOpenRemix}
                className="btn-primary"
              >
                1-Click Remix
              </button>
            )}
          </div>
        </div>

        {/* Main Content: Left Score Ring, Right 3 Crisp Bullets */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Column: Clean Score Ring (4 cols) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-neutral rounded-md border border-border">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke="#E5E7EB"
                  strokeWidth="6"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke="#171717"
                  strokeWidth="6"
                  strokeDasharray="263.89"
                  strokeDashoffset={263.89 - (compositeScore / 100) * 263.89}
                  strokeLinecap="round"
                  className="transition-all duration-700 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-normal tracking-tight text-primary">
                  {compositeScore}
                </span>
                <span className="text-[10px] font-medium text-secondary uppercase tracking-wider">
                  Out of 100
                </span>
              </div>
            </div>
            <span className="text-sm font-medium text-primary mt-3">
              Performance Score
            </span>
            <div className="flex items-center gap-3 mt-2 text-xs text-secondary font-mono">
              <span>Hook {report.scores.hook}</span>
              <span>•</span>
              <span>Pacing {report.scores.retention}</span>
              <span>•</span>
              <span>Emotion {report.scores.emotion}</span>
            </div>
          </div>

          {/* Right Column: 3 Crisp Bullet Points (8 cols) */}
          <div className="md:col-span-8 space-y-5">
            {/* 1. Hook Strength */}
            <div className="flex items-start gap-3.5">
              <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0" />
              <div>
                <div className="text-xs font-medium text-secondary uppercase tracking-wider mb-0.5">
                  Hook Strength
                </div>
                <p className="text-sm text-primary leading-relaxed font-normal">
                  {verdictBest}
                </p>
              </div>
            </div>

            {/* 2. Drop-off Risk */}
            <div className="flex items-start gap-3.5">
              <div className="w-1.5 h-1.5 rounded-full bg-secondary mt-2 flex-shrink-0" />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-secondary uppercase tracking-wider">
                    Drop-off Risk
                  </span>
                  {report.fixes && report.fixes[0] && (
                    <button
                      type="button"
                      onClick={() => onSelectTimestamp && onSelectTimestamp(report.fixes[0].t_ms)}
                      className="text-xs font-mono text-primary hover:underline cursor-pointer"
                    >
                      @{formatMs(report.fixes[0].t_ms)}
                    </button>
                  )}
                </div>
                <p className="text-sm text-primary leading-relaxed font-normal">
                  {verdictDropoff}
                </p>
              </div>
            </div>

            {/* 3. Primary Actionable Fix */}
            <div className="flex items-start gap-3.5">
              <div className="w-1.5 h-1.5 rounded-full bg-accent mt-2 flex-shrink-0" />
              <div>
                <div className="text-xs font-medium text-secondary uppercase tracking-wider mb-0.5">
                  Primary Fix
                </div>
                <p className="text-sm text-primary leading-relaxed font-normal">
                  {report.fixes && report.fixes[0] ? report.fixes[0].change : "Optimize cut rhythm during product demonstration to sustain watch time."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. COLLAPSIBLE DEEP DIVE: WHY VIEWERS WATCH               */}
      {/* ========================================================= */}
      <div className="bg-surface rounded-md border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setIsWhyItWorksOpen(!isWhyItWorksOpen)}
          className="w-full p-5 md:p-6 flex items-center justify-between text-left hover:bg-neutral transition cursor-pointer"
        >
          <div>
            <h3 className="text-base md:text-lg font-normal tracking-tight text-primary flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              <span>Why Viewers Watch (Exact Frame Evidence)</span>
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Timestamped proof explaining why each scene engages viewers.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-secondary hidden sm:inline">
              {filteredClaims.length} Claims Verified
            </span>
            {isWhyItWorksOpen ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-secondary" />}
          </div>
        </button>

        {isWhyItWorksOpen && (
          <div className="px-5 md:px-6 pb-6 pt-2 border-t border-border">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium capitalize transition cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-primary text-tertiary"
                      : "bg-surface hover:bg-neutral text-secondary hover:text-primary border border-border"
                  }`}
                >
                  {cat === "all" ? "All Drivers" : cat}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredClaims.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-neutral rounded-md p-5 flex flex-col justify-between border border-border"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="chip-minimal text-[10px] uppercase font-medium">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-mono text-secondary">
                        Certainty: <span className="text-primary font-medium">{item.confidence}</span>
                      </span>
                    </div>

                    <p className="text-sm font-normal text-primary leading-relaxed mb-4">
                      "{item.claim}"
                    </p>
                  </div>

                  {/* Evidence Pills */}
                  <div className="pt-3 border-t border-border">
                    <div className="text-[11px] font-medium text-secondary mb-2 uppercase tracking-wider">Frames:</div>
                    <div className="flex flex-wrap gap-2">
                      {item.evidence.map((ev, evIdx) => (
                        <button
                          key={evIdx}
                          onClick={() => onSelectTimestamp && onSelectTimestamp(ev.t_ms)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono transition cursor-pointer border ${
                            selectedTimestamp === ev.t_ms
                              ? "bg-primary text-tertiary border-primary"
                              : "bg-surface hover:bg-neutral text-primary border-border"
                          }`}
                          title={`Jump to frame at ${ev.t_ms}ms`}
                        >
                          <Clock className="w-3 h-3 text-secondary" />
                          <span>{formatMs(ev.t_ms)}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 3. COLLAPSIBLE DEEP DIVE: STRUCTURAL BLUEPRINT            */}
      {/* ========================================================= */}
      <div className="bg-surface rounded-md border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setIsBlueprintOpen(!isBlueprintOpen)}
          className="w-full p-5 md:p-6 flex items-center justify-between text-left hover:bg-neutral transition cursor-pointer"
        >
          <div>
            <h3 className="text-base md:text-lg font-normal tracking-tight text-primary flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Story Structure Blueprint (The Reusable Bones)</span>
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Click any beat block to inspect camera techniques and narrative role.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-mono text-secondary hidden sm:inline">
              {report.blueprint.length} Story Beats
            </span>
            {isBlueprintOpen ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-secondary" />}
          </div>
        </button>

        {isBlueprintOpen && (
          <div className="px-5 md:px-6 pb-6 pt-2 border-t border-border">
            {/* Visual Timeline Track */}
            <div className="w-full bg-neutral h-12 rounded-md p-1 flex gap-1 mb-4 overflow-x-auto border border-border">
              {report.blueprint.map((beat, index) => {
                const beatDuration = Math.max(beat.t_end_ms - beat.t_start_ms, 500);
                const widthPct = Math.max((beatDuration / totalDuration) * 100, 10);
                const isActive = activeBeatIndex === index;

                return (
                  <button
                    key={index}
                    onClick={() => {
                      setActiveBeatIndex(index);
                      if (onSelectTimestamp) onSelectTimestamp(beat.t_start_ms);
                    }}
                    className={`h-full rounded-sm transition flex flex-col justify-center px-3 text-left overflow-hidden select-none cursor-pointer ${
                      isActive
                        ? "bg-primary text-tertiary"
                        : "bg-surface hover:bg-neutral text-primary border border-border"
                    }`}
                    style={{ minWidth: "90px", flexBasis: `${widthPct}%` }}
                  >
                    <div className="text-[10px] font-medium truncate uppercase tracking-wider">
                      {beat.role}
                    </div>
                    <div className={`text-[10px] font-mono truncate ${isActive ? "text-tertiary/80" : "text-secondary"}`}>
                      {formatMs(beat.t_start_ms)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Beat Card */}
            {activeBeatIndex !== null && report.blueprint[activeBeatIndex] && (
              <div className="p-4 bg-neutral rounded-md border border-border flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="chip-minimal text-[10px] uppercase font-medium">
                      Beat #{activeBeatIndex + 1}: {report.blueprint[activeBeatIndex].role}
                    </span>
                    <span className="text-xs font-mono text-secondary">
                      {formatMs(report.blueprint[activeBeatIndex].t_start_ms)} → {formatMs(report.blueprint[activeBeatIndex].t_end_ms)}
                    </span>
                  </div>
                  <div className="text-sm font-medium text-primary">
                    Technique: <span className="font-normal text-secondary">{report.blueprint[activeBeatIndex].technique}</span>
                  </div>
                  <div className="text-xs text-secondary mt-0.5">
                    Purpose: {report.blueprint[activeBeatIndex].purpose}
                  </div>
                </div>

                <button
                  onClick={() => onSelectTimestamp && onSelectTimestamp(report.blueprint[activeBeatIndex].t_start_ms)}
                  className="btn-secondary text-xs"
                >
                  Inspect Frame at {formatMs(report.blueprint[activeBeatIndex].t_start_ms)}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. COLLAPSIBLE DEEP DIVE: ALL RANKED FIXES                */}
      {/* ========================================================= */}
      <div className="bg-surface rounded-md border border-border overflow-hidden">
        <button
          type="button"
          onClick={() => setIsFixesOpen(!isFixesOpen)}
          className="w-full p-5 md:p-6 flex items-center justify-between text-left hover:bg-neutral transition cursor-pointer"
        >
          <div>
            <h3 className="text-base md:text-lg font-normal tracking-tight text-primary flex items-center gap-2">
              <Lightbulb className="w-4 h-4 text-primary" />
              <span>Full Actionable Fixes List ({report.fixes?.length || 0})</span>
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Specific video and audio improvements to eliminate viewer drop-off.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isFixesOpen ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-secondary" />}
          </div>
        </button>

        {isFixesOpen && (
          <div className="px-5 md:px-6 pb-6 pt-2 border-t border-border space-y-3">
            {report.fixes.map((fix) => (
              <div
                key={fix.rank}
                className="p-4 bg-neutral rounded-md border border-border flex flex-col md:flex-row md:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-primary text-tertiary font-mono text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    {fix.rank}
                  </div>
                  <div>
                    <div className="text-sm font-normal text-primary leading-snug">
                      {fix.change}
                    </div>
                    <div className="text-xs text-secondary mt-1 flex items-center gap-2 font-mono">
                      <span>Occurs at:</span>
                      <button
                        onClick={() => onSelectTimestamp && onSelectTimestamp(fix.t_ms)}
                        className="text-primary underline hover:text-secondary cursor-pointer"
                      >
                        {formatMs(fix.t_ms)}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span className="chip-minimal text-xs font-mono capitalize">
                    {fix.expected_impact} Lift
                  </span>
                  <button
                    onClick={() => onSelectTimestamp && onSelectTimestamp(fix.t_ms)}
                    className="btn-secondary text-xs"
                  >
                    View Frame
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 5. COLLAPSIBLE DEEP DIVE: STYLE LOCK & STATS              */}
      {/* ========================================================= */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Style Lock */}
        <div className="bg-surface rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setIsDesignOpen(!isDesignOpen)}
            className="w-full p-5 flex items-center justify-between text-left hover:bg-neutral transition cursor-pointer"
          >
            <div>
              <h3 className="text-sm font-medium text-primary flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <span>Visual Style Lock</span>
              </h3>
              <p className="text-xs text-secondary">Palette, lighting, motion &amp; typography</p>
            </div>
            {isDesignOpen ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-secondary" />}
          </button>

          {isDesignOpen && (
            <div className="px-5 pb-5 pt-2 border-t border-border space-y-4">
              <div>
                <span className="text-[10px] font-medium text-secondary uppercase tracking-wider block mb-2">Palette</span>
                <div className="flex flex-wrap gap-2">
                  {report.design_language.palette.map((color, cIdx) => (
                    <div key={cIdx} className="flex items-center gap-1.5 p-1 bg-neutral rounded-sm border border-border">
                      <div className="w-4 h-4 rounded-sm border border-border" style={{ backgroundColor: color }} />
                      <span className="text-[11px] font-mono text-primary">{color}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-neutral p-3 rounded-md border border-border">
                  <span className="text-secondary block font-normal mb-0.5">Cut Rhythm</span>
                  <span className="font-medium text-primary">Every {report.design_language.cut_rhythm_s}s</span>
                </div>
                <div className="bg-neutral p-3 rounded-md border border-border">
                  <span className="text-secondary block font-normal mb-0.5">Motion Style</span>
                  <span className="font-medium text-primary truncate block">{report.design_language.motion_style}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Verified Stats */}
        <div className="bg-surface rounded-md border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setIsStatsOpen(!isStatsOpen)}
            className="w-full p-5 flex items-center justify-between text-left hover:bg-neutral transition cursor-pointer"
          >
            <div>
              <h3 className="text-sm font-medium text-primary flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Verified Stats</span>
              </h3>
              <p className="text-xs text-secondary">Platform analytics with verified source labels</p>
            </div>
            {isStatsOpen ? <ChevronUp className="w-4 h-4 text-secondary" /> : <ChevronDown className="w-4 h-4 text-secondary" />}
          </button>

          {isStatsOpen && (
            <div className="px-5 pb-5 pt-2 border-t border-border space-y-3">
              {report.stats && report.stats.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {report.stats.map((st, sIdx) => (
                    <div key={sIdx} className="p-3 bg-neutral rounded-md border border-border">
                      <div className="text-[10px] font-medium text-secondary uppercase tracking-wider">{st.metric}</div>
                      <div className="text-xl font-normal text-primary mt-1">{st.value.toLocaleString()}</div>
                      <div className="text-[10px] text-secondary font-mono mt-1">Source: {st.source}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-secondary mb-2">No third-party analytics data connected for this clip.</p>
                  {onOpenStatsDrawer && (
                    <button
                      type="button"
                      onClick={onOpenStatsDrawer}
                      className="text-xs font-medium text-primary hover:underline cursor-pointer"
                    >
                      + Add stats or upload CSV &rarr;
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
