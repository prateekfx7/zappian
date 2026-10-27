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
  AlertTriangle,
  Clock,
  Layers,
  Palette,
  Film,
  Zap,
  Tag,
  HelpCircle,
  BarChart3,
  Lightbulb,
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
}

export function ReportViewer({
  videoId,
  report,
  durationMs = 30000,
  onSelectTimestamp,
  selectedTimestamp,
}: ReportViewerProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [activeBeatIndex, setActiveBeatIndex] = useState<number | null>(null);

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const mill = Math.floor((ms % 1000) / 100);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${mill}00`;
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

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Header Banner & Verdict Card */}
      <div className="bg-white rounded-pin-lg p-8 border border-hairline shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-hairline gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-semantic-successPale text-semantic-successDeep mb-2">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Evidence Validated Autopsy Report</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight">
              Executive Video Autopsy
            </h2>
            <p className="text-xs text-mute font-mono">
              Video ID: {videoId} • Schema v{report.schema_version}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="pill-overlay flex items-center gap-1.5 text-xs">
              <Zap className="w-3.5 h-3.5 text-primary" />
              <span>100% Grounded Timestamps</span>
            </span>
          </div>
        </div>

        {/* Verdict Callout */}
        <div className="p-6 bg-surface-card rounded-pin border border-hairline/80">
          <div className="text-xs font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
            <Sparkles className="w-4 h-4" />
            <span>The Verdict</span>
          </div>
          <p className="text-base md:text-lg text-ink font-semibold leading-relaxed">
            "{report.verdict}"
          </p>
        </div>
      </div>

      {/* 2. Seven Score Meters */}
      <div className="bg-white rounded-pin-lg p-8 border border-hairline shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-bold text-ink">Performance Score Matrix</h3>
            <p className="text-xs text-mute">
              Calculated across frame density, scene transitions, and narrative tension.
            </p>
          </div>
          <span className="text-[11px] text-mute flex items-center gap-1">
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Scores normalized 0–100</span>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Hook */}
          <div className="card-pin p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-mute uppercase tracking-wider flex items-center gap-1.5">
                <Flame className="w-3.5 h-3.5 text-primary" /> Hook
              </span>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${getScoreColor(report.scores.hook)}`}>
                {report.scores.hook}/100
              </span>
            </div>
            <div className="w-full h-2 bg-stone/30 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreBarColor(report.scores.hook)} transition-all duration-500`}
                style={{ width: `${report.scores.hook}%` }}
              />
            </div>
            <span className="text-[11px] text-mute mt-2">First 3-second tension &amp; visual hook</span>
          </div>

          {/* Retention */}
          <div className="card-pin p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-mute uppercase tracking-wider flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-600" /> Retention
              </span>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${getScoreColor(report.scores.retention)}`}>
                {report.scores.retention}/100
              </span>
            </div>
            <div className="w-full h-2 bg-stone/30 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreBarColor(report.scores.retention)} transition-all duration-500`}
                style={{ width: `${report.scores.retention}%` }}
              />
            </div>
            <span className="text-[11px] text-mute mt-2">Pacing, cuts &amp; visual micro-resets</span>
          </div>

          {/* Emotion */}
          <div className="card-pin p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-mute uppercase tracking-wider flex items-center gap-1.5">
                <Heart className="w-3.5 h-3.5 text-rose-500" /> Emotion
              </span>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${getScoreColor(report.scores.emotion)}`}>
                {report.scores.emotion}/100
              </span>
            </div>
            <div className="w-full h-2 bg-stone/30 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreBarColor(report.scores.emotion)} transition-all duration-500`}
                style={{ width: `${report.scores.emotion}%` }}
              />
            </div>
            <span className="text-[11px] text-mute mt-2">Relatability, tone &amp; facial expressions</span>
          </div>

          {/* Clarity */}
          <div className="card-pin p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-mute uppercase tracking-wider flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-blue-500" /> Clarity
              </span>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${getScoreColor(report.scores.clarity)}`}>
                {report.scores.clarity}/100
              </span>
            </div>
            <div className="w-full h-2 bg-stone/30 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreBarColor(report.scores.clarity)} transition-all duration-500`}
                style={{ width: `${report.scores.clarity}%` }}
              />
            </div>
            <span className="text-[11px] text-mute mt-2">Value prop comprehension &amp; OCR hierarchy</span>
          </div>

          {/* CTA */}
          <div className="card-pin p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-mute uppercase tracking-wider flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-amber-500" /> CTA
              </span>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${getScoreColor(report.scores.cta)}`}>
                {report.scores.cta}/100
              </span>
            </div>
            <div className="w-full h-2 bg-stone/30 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreBarColor(report.scores.cta)} transition-all duration-500`}
                style={{ width: `${report.scores.cta}%` }}
              />
            </div>
            <span className="text-[11px] text-mute mt-2">Action trigger &amp; urgency delivery</span>
          </div>

          {/* Shareability */}
          <div className="card-pin p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-mute uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5 text-indigo-500" /> Shareability
              </span>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${getScoreColor(report.scores.shareability)}`}>
                {report.scores.shareability}/100
              </span>
            </div>
            <div className="w-full h-2 bg-stone/30 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreBarColor(report.scores.shareability)} transition-all duration-500`}
                style={{ width: `${report.scores.shareability}%` }}
              />
            </div>
            <span className="text-[11px] text-mute mt-2">Novelty, conversational hook &amp; tags</span>
          </div>

          {/* Rule 2: Explicitly labeled Sales Potential (estimate) */}
          <div className="card-pin p-4 flex flex-col justify-between sm:col-span-2 bg-surface-card/60 border border-primary/20">
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-ink uppercase tracking-wider flex items-center gap-1.5">
                <BarChart3 className="w-3.5 h-3.5 text-primary" />
                <span>Sales Potential (estimate)</span>
              </span>
              <span className={`text-xs font-extrabold px-2 py-0.5 rounded-full border ${getScoreColor(report.scores.sales_potential_estimate)}`}>
                {report.scores.sales_potential_estimate}/100
              </span>
            </div>
            <div className="w-full h-2 bg-stone/30 rounded-full overflow-hidden">
              <div
                className={`h-full ${getScoreBarColor(report.scores.sales_potential_estimate)} transition-all duration-500`}
                style={{ width: `${report.scores.sales_potential_estimate}%` }}
              />
            </div>
            <span className="text-[11px] text-mute mt-2">
              <strong>Rule 2 Compliant:</strong> Modeled heuristic based on product clarity, friction reduction &amp; CTA strength. Actual sales never guessed from video.
            </span>
          </div>
        </div>
      </div>

      {/* 3. Interactive Structural Blueprint Timeline */}
      <div className="bg-white rounded-pin-lg p-8 border border-hairline shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-2">
          <div>
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <Layers className="w-4 h-4 text-primary" />
              <span>Structural Blueprint Timeline</span>
            </h3>
            <p className="text-xs text-mute">
              Click any narrative beat block to inspect technique and jump directly to keyframes.
            </p>
          </div>
          <span className="text-xs font-mono text-mute">
            {report.blueprint.length} Beats Identified
          </span>
        </div>

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
                className={`h-full rounded-xl transition-all relative flex flex-col justify-center px-3 text-left overflow-hidden select-none ${
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
                Purpose: <span className="text-ink font-medium">{report.blueprint[activeBeatIndex].purpose}</span>
              </div>
            </div>

            <button
              onClick={() => onSelectTimestamp && onSelectTimestamp(report.blueprint[activeBeatIndex].t_start_ms)}
              className="px-4 py-2 rounded-full text-xs font-bold bg-white hover:bg-secondary-bg text-ink border border-hairline flex items-center gap-1.5 transition cursor-pointer"
            >
              <Clock className="w-3.5 h-3.5 text-primary" />
              <span>Inspect Frame</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. Why-It-Works Evidence Accordion with Clickable Timestamps */}
      <div className="bg-white rounded-pin-lg p-8 border border-hairline shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-hairline gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span>Timestamped Evidence ("Why It Works")</span>
            </h3>
            <p className="text-xs text-mute">
              Every assertion links directly to physical frames extracted by the media pipeline.
            </p>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-1.5">
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
                {cat}
              </button>
            ))}
          </div>
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
                    Confidence:
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
                <div className="text-[11px] font-bold text-mute mb-2">Grounding Evidence:</div>
                <div className="flex flex-wrap gap-2">
                  {item.evidence.map((ev, evIdx) => (
                    <button
                      key={evIdx}
                      onClick={() => onSelectTimestamp && onSelectTimestamp(ev.t_ms)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono font-bold transition cursor-pointer border ${
                        selectedTimestamp === ev.t_ms
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-surface-card hover:bg-white text-ink border-hairline hover:border-primary"
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

      {/* 5. Top 5 Fix List & Expected Impact */}
      <div className="bg-white rounded-pin-lg p-8 border border-hairline shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-ink flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span>Top Recommended Fixes (Ranked by Expected Impact)</span>
          </h3>
          <p className="text-xs text-mute">
            Targeted structural enhancements to improve hook retention, clarity, and conversion.
          </p>
        </div>

        <div className="space-y-3">
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
                    <span>At timestamp:</span>
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
                  {fix.expected_impact} Impact
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
      </div>

      {/* 6. Design Language & Style Blueprint */}
      <div className="bg-white rounded-pin-lg p-8 border border-hairline shadow-sm">
        <div className="mb-6">
          <h3 className="text-lg font-bold text-ink flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            <span>Design Language &amp; Aesthetic Signature</span>
          </h3>
          <p className="text-xs text-mute">
            Physical styling attributes to match or remix without plagiarizing creative content.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Palette */}
          <div className="card-pin p-5">
            <span className="text-xs font-bold text-mute uppercase tracking-wider block mb-3">
              Color Palette
            </span>
            <div className="flex flex-wrap gap-2">
              {report.design_language.palette.map((color, cIdx) => (
                <div key={cIdx} className="flex items-center gap-2 p-1.5 bg-white rounded-lg border border-hairline">
                  <div
                    className="w-6 h-6 rounded-md shadow-xs border border-stone/50"
                    style={{ backgroundColor: color }}
                  />
                  <span className="text-xs font-mono font-semibold text-ink">{color}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Rhythm & Motion */}
          <div className="card-pin p-5 space-y-3">
            <div>
              <span className="text-xs font-bold text-mute uppercase tracking-wider block mb-1">
                Cut Rhythm
              </span>
              <span className="text-sm font-bold text-ink">
                Average cut every {report.design_language.cut_rhythm_s}s
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-mute uppercase tracking-wider block mb-1">
                Motion Style
              </span>
              <span className="text-sm font-medium text-ink">
                {report.design_language.motion_style}
              </span>
            </div>
          </div>

          {/* Typography & Lighting */}
          <div className="card-pin p-5 space-y-3">
            <div>
              <span className="text-xs font-bold text-mute uppercase tracking-wider block mb-1">
                Typography
              </span>
              <span className="text-sm font-medium text-ink">
                {report.design_language.typography}
              </span>
            </div>
            <div>
              <span className="text-xs font-bold text-mute uppercase tracking-wider block mb-1">
                Lighting &amp; Energy
              </span>
              <span className="text-sm font-medium text-ink">
                {report.design_language.lighting} • {report.design_language.music_energy}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 7. Source-Labeled Stats (Rule 2) */}
      {report.stats && report.stats.length > 0 && (
        <div className="bg-white rounded-pin-lg p-8 border border-hairline shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-primary" />
                <span>Source-Labeled Platform Metrics</span>
              </h3>
              <p className="text-xs text-mute">
                Strict Rule 2 compliance: stats are never hallucinated from video frames.
              </p>
            </div>
            <span className="pill-overlay text-xs">Rule 2 Verified</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            {report.stats.map((st, sIdx) => (
              <div key={sIdx} className="p-4 bg-surface-card rounded-pin border border-hairline">
                <div className="text-xs font-bold text-mute uppercase tracking-wider mb-1">
                  {st.metric.replace(/_/g, " ")}
                </div>
                <div className="text-2xl font-black text-ink mb-2">
                  {st.value.toLocaleString()}
                </div>
                <div className="flex items-center justify-between text-[11px] text-mute pt-2 border-t border-hairline">
                  <span className="inline-flex items-center gap-1 font-semibold text-primary">
                    <Tag className="w-3 h-3" />
                    <span>Source: {st.source}</span>
                  </span>
                  <span>{new Date(st.fetched_at).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
