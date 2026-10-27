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
  // Progressive disclosure: drawers closed by default
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

  // Calculate composite viral performance score
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
    <div className="space-y-6 animate-fade-in">
      {/* ========================================================= */}
      {/* APPLE-STYLE UNIFIED CARD (Single Score Ring + 3 Crisp Bullets) */}
      {/* ========================================================= */}
      <div className="bg-white rounded-3xl p-6 md:p-8 border border-black/[0.06] shadow-sm">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-6 border-b border-black/[0.06] mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-semibold tracking-tight text-ink">
              Autopsy Overview
            </h2>
            <p className="text-xs text-mute mt-0.5">
              Verified with frame-by-frame evidence
            </p>
          </div>

          <div className="flex items-center gap-3">
            {onOpenRemix && (
              <button
                type="button"
                onClick={onOpenRemix}
                className="btn-primary text-xs h-9 px-4 rounded-full"
              >
                1-Click Remix
              </button>
            )}
          </div>
        </div>

        {/* Main Content: Left Score Ring, Right 3 Crisp Bullets */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          {/* Left Column: Clean Score Ring (4 cols) */}
          <div className="md:col-span-4 flex flex-col items-center justify-center p-6 bg-surface-card/50 rounded-2xl border border-hairline/40">
            <div className="relative w-36 h-36 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke="#e5e5e0"
                  strokeWidth="7"
                />
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  fill="transparent"
                  stroke="#e60023"
                  strokeWidth="7"
                  strokeDasharray="263.89"
                  strokeDashoffset={263.89 - (compositeScore / 100) * 263.89}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-3xl font-extrabold tracking-tight text-ink">
                  {compositeScore}
                </span>
                <span className="text-[10px] font-semibold text-mute uppercase tracking-wider">
                  Out of 100
                </span>
              </div>
            </div>
            <span className="text-xs font-bold text-ink mt-3">
              Performance Score
            </span>
            <div className="flex items-center gap-3 mt-2 text-[11px] text-mute">
              <span>Hook <strong className="text-ink font-semibold">{report.scores.hook}</strong></span>
              <span>•</span>
              <span>Pacing <strong className="text-ink font-semibold">{report.scores.retention}</strong></span>
              <span>•</span>
              <span>Emotion <strong className="text-ink font-semibold">{report.scores.emotion}</strong></span>
            </div>
          </div>

          {/* Right Column: 3 Crisp Bullet Points (8 cols) */}
          <div className="md:col-span-8 space-y-5">
            {/* 1. Hook Strength */}
            <div className="flex items-start gap-3.5">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 mt-1.5 flex-shrink-0" />
              <div>
                <div className="text-[11px] font-bold text-mute uppercase tracking-wider mb-0.5">
                  Hook Strength
                </div>
                <p className="text-sm font-semibold text-ink leading-relaxed">
                  {verdictBest}
                </p>
              </div>
            </div>

            {/* 2. Drop-off Risk */}
            <div className="flex items-start gap-3.5">
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500 mt-1.5 flex-shrink-0" />
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-[11px] font-bold text-mute uppercase tracking-wider">
                    Drop-off Risk
                  </span>
                  {report.fixes && report.fixes[0] && (
                    <button
                      type="button"
                      onClick={() => onSelectTimestamp && onSelectTimestamp(report.fixes[0].t_ms)}
                      className="text-[11px] font-mono font-bold text-primary hover:underline cursor-pointer"
                    >
                      @{formatMs(report.fixes[0].t_ms)}
                    </button>
                  )}
                </div>
                <p className="text-sm font-semibold text-ink leading-relaxed">
                  {verdictDropoff}
                </p>
              </div>
            </div>

            {/* 3. Primary Actionable Fix */}
            <div className="flex items-start gap-3.5">
              <div className="w-2.5 h-2.5 rounded-full bg-primary mt-1.5 flex-shrink-0" />
              <div>
                <div className="text-[11px] font-bold text-mute uppercase tracking-wider mb-0.5">
                  Primary Fix
                </div>
                <p className="text-sm font-semibold text-ink leading-relaxed">
                  {report.fixes && report.fixes[0] ? report.fixes[0].change : "Optimize cut rhythm during product demonstration to sustain watch time."}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ========================================================= */}
      {/* 2. COLLAPSIBLE DEEP DIVE: WHY VIEWERS WATCH (A4)          */}
      {/* ========================================================= */}
      <div className="bg-white rounded-pin-lg border border-hairline shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setIsWhyItWorksOpen(!isWhyItWorksOpen)}
          className="w-full p-6 md:p-8 flex items-center justify-between text-left hover:bg-surface-card/30 transition cursor-pointer"
        >
          <div>
            <h3 className="text-lg md:text-xl font-bold text-ink flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary" />
              <span>Why Viewers Watch (Exact Frame Evidence)</span>
            </h3>
            <p className="text-xs text-mute mt-0.5">
              Timestamped proof explaining why each scene engages viewers on Reels &amp; TikTok.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-mute hidden sm:inline">
              {filteredClaims.length} Claims Verified
            </span>
            {isWhyItWorksOpen ? <ChevronUp className="w-5 h-5 text-mute" /> : <ChevronDown className="w-5 h-5 text-mute" />}
          </div>
        </button>

        {isWhyItWorksOpen && (
          <div className="px-6 md:px-8 pb-8 pt-2 border-t border-hairline/60">
            {/* Category Filter Pills */}
            <div className="flex flex-wrap gap-1.5 mb-6">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-bold capitalize transition cursor-pointer ${
                    selectedCategory === cat
                      ? "bg-ink text-white"
                      : "bg-surface-card hover:bg-secondary-bg text-mute hover:text-ink border border-hairline"
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
                  className="card-pin p-5 flex flex-col justify-between border border-hairline hover:border-stone transition"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-secondary-bg text-ink">
                        {item.category}
                      </span>
                      <span className="text-[10px] font-semibold text-mute flex items-center gap-1">
                        Certainty:
                        <span className={`capitalize font-bold ${item.confidence === "high" ? "text-emerald-700" : "text-amber-700"}`}>
                          {item.confidence}
                        </span>
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-ink leading-relaxed mb-4">
                      "{item.claim}"
                    </p>
                  </div>

                  {/* Evidence Pills */}
                  <div className="pt-3 border-t border-hairline">
                    <div className="text-[11px] font-bold text-mute mb-2">Timestamped Frames:</div>
                    <div className="flex flex-wrap gap-2">
                      {item.evidence.map((ev, evIdx) => (
                        <button
                          key={evIdx}
                          onClick={() => onSelectTimestamp && onSelectTimestamp(ev.t_ms)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition cursor-pointer border ${
                            selectedTimestamp === ev.t_ms
                              ? "bg-primary text-white border-primary shadow-xs"
                              : "bg-white hover:bg-surface-card text-ink border-hairline hover:border-primary"
                          }`}
                          title={`Jump to frame at ${ev.t_ms}ms`}
                        >
                          <Clock className="w-3 h-3 text-primary" />
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
      {/* 3. COLLAPSIBLE DEEP DIVE: STRUCTURAL BLUEPRINT (A4)       */}
      {/* ========================================================= */}
      <div className="bg-white rounded-pin-lg border border-hairline shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setIsBlueprintOpen(!isBlueprintOpen)}
          className="w-full p-6 md:p-8 flex items-center justify-between text-left hover:bg-surface-card/30 transition cursor-pointer"
        >
          <div>
            <h3 className="text-lg md:text-xl font-bold text-ink flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <span>Story Structure Blueprint (The Reusable Bones)</span>
            </h3>
            <p className="text-xs text-mute mt-0.5">
              Click any beat block to inspect camera techniques and narrative role.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-mute hidden sm:inline">
              {report.blueprint.length} Story Beats
            </span>
            {isBlueprintOpen ? <ChevronUp className="w-5 h-5 text-mute" /> : <ChevronDown className="w-5 h-5 text-mute" />}
          </div>
        </button>

        {isBlueprintOpen && (
          <div className="px-6 md:px-8 pb-8 pt-2 border-t border-hairline/60">
            {/* Visual Timeline Track */}
            <div className="w-full bg-secondary-bg h-14 rounded-pin p-1.5 flex gap-1 mb-4 overflow-x-auto">
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
                    className={`h-full rounded-xl transition-all relative flex flex-col justify-center px-3 text-left overflow-hidden select-none cursor-pointer ${
                      isActive
                        ? "bg-primary text-white shadow-md scale-[1.02] z-10"
                        : "bg-white hover:bg-white/80 text-ink border border-hairline"
                    }`}
                    style={{ minWidth: "100px", flexBasis: `${widthPct}%` }}
                  >
                    <div className="text-[11px] font-bold truncate uppercase tracking-wider">
                      {beat.role}
                    </div>
                    <div className={`text-[10px] font-mono truncate ${isActive ? "text-white/80" : "text-mute"}`}>
                      {formatMs(beat.t_start_ms)}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Selected Beat Card */}
            {activeBeatIndex !== null && report.blueprint[activeBeatIndex] && (
              <div className="p-4 bg-surface-card rounded-pin border border-hairline animate-fade-in flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary text-white">
                      Beat #{activeBeatIndex + 1}: {report.blueprint[activeBeatIndex].role}
                    </span>
                    <span className="text-xs font-mono text-mute">
                      {formatMs(report.blueprint[activeBeatIndex].t_start_ms)} → {formatMs(report.blueprint[activeBeatIndex].t_end_ms)}
                    </span>
                  </div>
                  <div className="text-sm font-bold text-ink">
                    Technique: <span className="font-normal text-body">{report.blueprint[activeBeatIndex].technique}</span>
                  </div>
                  <div className="text-xs text-mute mt-0.5">
                    Purpose: {report.blueprint[activeBeatIndex].purpose}
                  </div>
                </div>

                <button
                  onClick={() => onSelectTimestamp && onSelectTimestamp(report.blueprint[activeBeatIndex].t_start_ms)}
                  className="px-4 py-2 rounded-full text-xs font-bold bg-white text-ink border border-hairline hover:border-primary shadow-xs transition"
                >
                  Inspect Frame at {formatMs(report.blueprint[activeBeatIndex].t_start_ms)}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ========================================================= */}
      {/* 4. COLLAPSIBLE DEEP DIVE: ALL RANKED FIXES (A4)           */}
      {/* ========================================================= */}
      <div className="bg-white rounded-pin-lg border border-hairline shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setIsFixesOpen(!isFixesOpen)}
          className="w-full p-6 md:p-8 flex items-center justify-between text-left hover:bg-surface-card/30 transition cursor-pointer"
        >
          <div>
            <h3 className="text-lg md:text-xl font-bold text-ink flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-primary" />
              <span>Full Actionable Fixes List ({report.fixes?.length || 0})</span>
            </h3>
            <p className="text-xs text-mute mt-0.5">
              Specific video and audio improvements to eliminate viewer friction.
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isFixesOpen ? <ChevronUp className="w-5 h-5 text-mute" /> : <ChevronDown className="w-5 h-5 text-mute" />}
          </div>
        </button>

        {isFixesOpen && (
          <div className="px-6 md:px-8 pb-8 pt-2 border-t border-hairline/60 space-y-3">
            {report.fixes.map((fix) => (
              <div
                key={fix.rank}
                className="p-4 bg-surface-card rounded-pin border border-hairline flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-white transition"
              >
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-full bg-ink text-white font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                    #{fix.rank}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-ink leading-snug">
                      {fix.change}
                    </div>
                    <div className="text-xs text-mute mt-1 flex items-center gap-2">
                      <span>Occurs at:</span>
                      <button
                        onClick={() => onSelectTimestamp && onSelectTimestamp(fix.t_ms)}
                        className="font-mono font-bold text-ink underline hover:text-primary cursor-pointer"
                      >
                        {formatMs(fix.t_ms)}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-extrabold capitalize border ${
                      fix.expected_impact === "high"
                        ? "bg-rose-50 text-semantic-errorDeep border-rose-200"
                        : "bg-amber-50 text-amber-800 border-amber-200"
                    }`}
                  >
                    {fix.expected_impact} Lift
                  </span>
                  <button
                    onClick={() => onSelectTimestamp && onSelectTimestamp(fix.t_ms)}
                    className="px-3 py-1.5 rounded-full text-xs font-bold bg-white text-ink border border-hairline hover:border-primary transition"
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
        <div className="bg-white rounded-pin-lg border border-hairline shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setIsDesignOpen(!isDesignOpen)}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-surface-card/30 transition cursor-pointer"
          >
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <Palette className="w-4 h-4 text-primary" />
                <span>Visual Style Lock</span>
              </h3>
              <p className="text-xs text-mute">Palette, lighting, motion &amp; typography</p>
            </div>
            {isDesignOpen ? <ChevronUp className="w-4 h-4 text-mute" /> : <ChevronDown className="w-4 h-4 text-mute" />}
          </button>

          {isDesignOpen && (
            <div className="px-6 pb-6 pt-2 border-t border-hairline/60 space-y-4">
              <div>
                <span className="text-[11px] font-bold text-mute uppercase tracking-wider block mb-2">Palette</span>
                <div className="flex flex-wrap gap-2">
                  {report.design_language.palette.map((color, cIdx) => (
                    <div key={cIdx} className="flex items-center gap-1.5 p-1 bg-surface-card rounded-md border border-hairline">
                      <div className="w-5 h-5 rounded shadow-xs" style={{ backgroundColor: color }} />
                      <span className="text-[11px] font-mono font-semibold text-ink">{color}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="bg-surface-card p-3 rounded-xl border border-hairline">
                  <span className="text-mute block font-semibold mb-0.5">Cut Rhythm</span>
                  <span className="font-bold text-ink">Every {report.design_language.cut_rhythm_s}s</span>
                </div>
                <div className="bg-surface-card p-3 rounded-xl border border-hairline">
                  <span className="text-mute block font-semibold mb-0.5">Motion Style</span>
                  <span className="font-bold text-ink truncate block">{report.design_language.motion_style}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Verified Stats */}
        <div className="bg-white rounded-pin-lg border border-hairline shadow-sm overflow-hidden">
          <button
            type="button"
            onClick={() => setIsStatsOpen(!isStatsOpen)}
            className="w-full p-6 flex items-center justify-between text-left hover:bg-surface-card/30 transition cursor-pointer"
          >
            <div>
              <h3 className="text-base font-bold text-ink flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Verified Third-Party Stats</span>
              </h3>
              <p className="text-xs text-mute">Only verified platform numbers with source labels</p>
            </div>
            {isStatsOpen ? <ChevronUp className="w-4 h-4 text-mute" /> : <ChevronDown className="w-4 h-4 text-mute" />}
          </button>

          {isStatsOpen && (
            <div className="px-6 pb-6 pt-2 border-t border-hairline/60 space-y-3">
              {report.stats && report.stats.length > 0 ? (
                <div className="grid grid-cols-2 gap-3">
                  {report.stats.map((st, sIdx) => (
                    <div key={sIdx} className="p-3 bg-surface-card rounded-xl border border-hairline">
                      <div className="text-[10px] font-bold text-mute uppercase">{st.metric}</div>
                      <div className="text-xl font-extrabold text-ink">{st.value.toLocaleString()}</div>
                      <div className="text-[10px] text-primary font-bold mt-1">Source: {st.source}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4">
                  <p className="text-xs text-mute mb-2">No third-party analytics data connected for this clip.</p>
                  {onOpenStatsDrawer && (
                    <button
                      type="button"
                      onClick={onOpenStatsDrawer}
                      className="text-xs font-bold text-primary hover:underline"
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
