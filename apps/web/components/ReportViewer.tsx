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
  // Simplification States (A2 & A4)
  const [isProMode, setIsProMode] = useState<boolean>(false);
  const [isWhyItWorksOpen, setIsWhyItWorksOpen] = useState<boolean>(true);
  const [isBlueprintOpen, setIsBlueprintOpen] = useState<boolean>(true);
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

  const getScoreColor = (score: number) => {
    if (score >= 85) return "text-semantic-successDeep bg-semantic-successPale border-semantic-successDeep/20";
    if (score >= 70) return "text-amber-800 bg-amber-100 border-amber-300";
    return "text-semantic-errorDeep bg-rose-100 border-semantic-errorDeep/20";
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 85) return "bg-emerald-600";
    if (score >= 70) return "bg-amber-500";
    return "bg-primary";
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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* ========================================================= */}
      {/* 1. EXECUTIVE SUMMARY CARD (A4: Summary-First Presentation) */}
      {/* ========================================================= */}
      <div className="bg-white rounded-pin-lg p-6 md:p-8 border border-hairline shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl pointer-events-none" />

        {/* Top Bar with Mode Toggle */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-hairline gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-semantic-successPale text-semantic-successDeep mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Autopsy Verified with Frame Evidence</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight">
              Video Ad Autopsy
            </h2>
            <p className="text-xs text-mute">
              {isProMode ? `Video ID: ${videoId} • Schema v${report.schema_version}` : "Plain-English creator summary"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Pro Mode Toggle (A2) */}
            <button
              type="button"
              onClick={() => setIsProMode(!isProMode)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 border transition cursor-pointer ${
                isProMode
                  ? "bg-ink text-white border-ink shadow-xs"
                  : "bg-surface-card hover:bg-white text-mute hover:text-ink border-hairline"
              }`}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{isProMode ? "Pro Editor Mode Active" : "Show Pro Details"}</span>
            </button>

            {onOpenRemix && (
              <button
                type="button"
                onClick={onOpenRemix}
                className="btn-primary gap-1.5 text-xs h-9 cursor-pointer"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>1-Click Remix</span>
              </button>
            )}
          </div>
        </div>

        {/* 3-Line Verdict Box */}
        <div className="p-6 bg-surface-card rounded-pin border border-hairline/80 mb-6 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-primary flex items-center gap-1.5">
              <Sparkles className="w-4 h-4" />
              <span>The 3-Line Verdict</span>
            </span>
            <span className="text-[11px] text-mute font-medium">Scannable Creator Summary</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
            <div className="bg-white p-4 rounded-xl border border-hairline/60">
              <div className="text-[11px] font-bold text-semantic-successDeep uppercase tracking-wider mb-1">
                ✓ What It Does Best
              </div>
              <p className="text-sm font-semibold text-ink leading-snug">{verdictBest}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-hairline/60">
              <div className="text-[11px] font-bold text-amber-800 uppercase tracking-wider mb-1">
                ⚠ Where Viewers Drop Off
              </div>
              <p className="text-sm font-semibold text-ink leading-snug">{verdictDropoff}</p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-hairline/60">
              <div className="text-[11px] font-bold text-primary uppercase tracking-wider mb-1">
                📱 Best Platform Fit
              </div>
              <p className="text-sm font-semibold text-ink leading-snug">{verdictFit}</p>
            </div>
          </div>
        </div>

        {/* Top 3 Quick Fixes Callout (Right inside Summary) */}
        {report.fixes && report.fixes.length > 0 && (
          <div className="p-6 bg-rose-50/50 rounded-pin border border-rose-200/80 mb-6">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-800 flex items-center gap-1.5">
                <Lightbulb className="w-4 h-4 text-primary" />
                <span>Top 3 Actionable Fixes (Ranked by Retention Lift)</span>
              </span>
              <span className="text-[11px] text-rose-700 font-semibold">Immediate Wins</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {report.fixes.slice(0, 3).map((fix) => (
                <div key={fix.rank} className="bg-white p-3.5 rounded-xl border border-rose-200/60 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-rose-100 text-rose-800">
                        Fix #{fix.rank}
                      </span>
                      <button
                        onClick={() => onSelectTimestamp && onSelectTimestamp(fix.t_ms)}
                        className="text-[11px] font-mono font-bold text-primary hover:underline flex items-center gap-1"
                      >
                        <Clock className="w-3 h-3" />
                        <span>{formatMs(fix.t_ms)}</span>
                      </button>
                    </div>
                    <p className="text-xs font-bold text-ink leading-snug">{fix.change}</p>
                  </div>
                  <div className="text-[10px] text-semantic-successDeep font-bold mt-2">
                    +{fix.expected_impact.toUpperCase()} RETENTION IMPACT
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Six Creator Score Badges (A2: Plain-English terms) */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-bold text-ink">Creator Scorecard</h3>
            <span className="text-[11px] text-mute">Normalized 0–100 estimates</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {/* Hook */}
            <div className="card-pin p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-mute uppercase flex items-center gap-1">
                  <Flame className="w-3 h-3 text-primary" /> Stop Scroll
                </span>
                <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full border ${getScoreColor(report.scores.hook)}`}>
                  {report.scores.hook}
                </span>
              </div>
              <div className="w-full h-1.5 bg-stone/30 rounded-full overflow-hidden mt-1">
                <div className={`h-full ${getScoreBarColor(report.scores.hook)}`} style={{ width: `${report.scores.hook}%` }} />
              </div>
              <span className="text-[10px] text-mute mt-1.5">0–3s Hook</span>
            </div>

            {/* Retention */}
            <div className="card-pin p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-mute uppercase flex items-center gap-1">
                  <Activity className="w-3 h-3 text-emerald-600" /> Pacing
                </span>
                <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full border ${getScoreColor(report.scores.retention)}`}>
                  {report.scores.retention}
                </span>
              </div>
              <div className="w-full h-1.5 bg-stone/30 rounded-full overflow-hidden mt-1">
                <div className={`h-full ${getScoreBarColor(report.scores.retention)}`} style={{ width: `${report.scores.retention}%` }} />
              </div>
              <span className="text-[10px] text-mute mt-1.5">Cut Rhythm</span>
            </div>

            {/* Emotion */}
            <div className="card-pin p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-mute uppercase flex items-center gap-1">
                  <Heart className="w-3 h-3 text-rose-500" /> Emotion
                </span>
                <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full border ${getScoreColor(report.scores.emotion)}`}>
                  {report.scores.emotion}
                </span>
              </div>
              <div className="w-full h-1.5 bg-stone/30 rounded-full overflow-hidden mt-1">
                <div className={`h-full ${getScoreBarColor(report.scores.emotion)}`} style={{ width: `${report.scores.emotion}%` }} />
              </div>
              <span className="text-[10px] text-mute mt-1.5">Relatability</span>
            </div>

            {/* Clarity */}
            <div className="card-pin p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-mute uppercase flex items-center gap-1">
                  <Eye className="w-3 h-3 text-blue-500" /> Clarity
                </span>
                <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full border ${getScoreColor(report.scores.clarity)}`}>
                  {report.scores.clarity}
                </span>
              </div>
              <div className="w-full h-1.5 bg-stone/30 rounded-full overflow-hidden mt-1">
                <div className={`h-full ${getScoreBarColor(report.scores.clarity)}`} style={{ width: `${report.scores.clarity}%` }} />
              </div>
              <span className="text-[10px] text-mute mt-1.5">Value Pitch</span>
            </div>

            {/* CTA */}
            <div className="card-pin p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-mute uppercase flex items-center gap-1">
                  <Zap className="w-3 h-3 text-amber-500" /> Next Action
                </span>
                <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full border ${getScoreColor(report.scores.cta)}`}>
                  {report.scores.cta}
                </span>
              </div>
              <div className="w-full h-1.5 bg-stone/30 rounded-full overflow-hidden mt-1">
                <div className={`h-full ${getScoreBarColor(report.scores.cta)}`} style={{ width: `${report.scores.cta}%` }} />
              </div>
              <span className="text-[10px] text-mute mt-1.5">Conversion</span>
            </div>

            {/* Shareability */}
            <div className="card-pin p-3.5 flex flex-col justify-between">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-mute uppercase flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-indigo-500" /> Share Potential
                </span>
                <span className={`text-[11px] font-black px-1.5 py-0.5 rounded-full border ${getScoreColor(report.scores.shareability)}`}>
                  {report.scores.shareability}
                </span>
              </div>
              <div className="w-full h-1.5 bg-stone/30 rounded-full overflow-hidden mt-1">
                <div className={`h-full ${getScoreBarColor(report.scores.shareability)}`} style={{ width: `${report.scores.shareability}%` }} />
              </div>
              <span className="text-[10px] text-mute mt-1.5">Send to Friend</span>
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
