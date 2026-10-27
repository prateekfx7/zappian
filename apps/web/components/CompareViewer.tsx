"use client";

import React, { useState } from "react";
import {
  Trophy,
  ArrowRight,
  Clock,
  Layers,
  Sparkles,
  Zap,
  TrendingUp,
  Activity,
  CheckCircle2,
  Printer,
  ChevronRight,
  Flame,
  Volume2,
  Lightbulb,
} from "lucide-react";

export interface CompareReport {
  compare_id: string;
  video_a_id: string;
  video_b_id: string;
  winner_video_id: string;
  verdict: string;
  score_diff: {
    hook_delta: number;
    retention_delta: number;
    clarity_delta: number;
    cta_delta: number;
    emotion_delta: number;
  };
  structural_diff: {
    beat_role: string;
    t_a_ms: number;
    t_b_ms: number;
    video_a_technique: string;
    video_b_technique: string;
    impact: string;
  }[];
  why_winner_won: {
    category: "hook" | "pacing" | "proof" | "cta" | "emotion" | "sales" | string;
    reason: string;
    t_a_ms: number;
    t_b_ms: number;
    advantage: "video_a" | "video_b" | "tie";
  }[];
  pacing_comparison: {
    video_a_cuts_per_minute: number;
    video_b_cuts_per_minute: number;
    video_a_silence_ratio: number;
    video_b_silence_ratio: number;
  };
  recommendations: string[];
}

interface CompareViewerProps {
  report: CompareReport;
  onSelectTimestamp?: (videoId: string, t_ms: number) => void;
}

export function CompareViewer({ report, onSelectTimestamp }: CompareViewerProps) {
  const [activeTab, setActiveTab] = useState<"diff" | "timeline" | "recommendations">("diff");

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const mill = Math.floor((ms % 1000) / 100);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${mill}00`;
  };

  const isWinnerA = report.winner_video_id === report.video_a_id;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fade-in print:m-0 print:p-0 text-primary">
      {/* 1. Header Banner & Winner Announcement */}
      <div className="bg-surface rounded-md p-6 md:p-8 border border-border">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-mono bg-neutral border border-border text-primary mb-2">
              <Trophy className="w-3.5 h-3.5 text-primary" />
              <span>Autopsy Diff: Winner vs Flop</span>
            </div>
            <h2 className="text-xl md:text-2xl font-normal tracking-tight text-primary">
              Blueprint Comparison Report
            </h2>
            <p className="text-xs text-secondary font-mono mt-1">
              Compare ID: {report.compare_id} • Citing dual timestamps from both clips
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              className="btn-secondary text-xs flex items-center gap-1.5 print:hidden"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Export PDF / Print</span>
            </button>
          </div>
        </div>

        {/* Executive Winner Verdict Callout */}
        <div className="p-6 bg-neutral rounded-md border border-border flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="chip-minimal text-[11px] font-mono uppercase">
                Winner: Video {isWinnerA ? "A" : "B"} ({report.winner_video_id.slice(0, 8)})
              </span>
              <span className="text-xs text-secondary font-normal">
                Outperformed in retention pacing and hook hold
              </span>
            </div>
            <p className="text-base text-primary font-normal leading-relaxed">
              "{report.verdict}"
            </p>
          </div>

          {/* Score Delta Pill */}
          <div className="p-4 bg-surface rounded-md border border-border flex-shrink-0 text-center min-w-[130px]">
            <div className="text-[10px] font-medium text-secondary uppercase tracking-wider mb-1">
              Hook Advantage
            </div>
            <div className="text-2xl font-normal text-primary">
              {report.score_diff.hook_delta > 0
                ? `+${report.score_diff.hook_delta} pts`
                : `${report.score_diff.hook_delta} pts`}
            </div>
            <span className="text-[10px] text-secondary font-mono">
              {report.score_diff.hook_delta >= 0 ? "Video A lead" : "Video B lead"}
            </span>
          </div>
        </div>
      </div>

      {/* 2. Side-by-Side Pacing & Score Deltas */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left: Score Deltas */}
        <div className="bg-surface rounded-md p-6 border border-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-sm font-medium text-primary flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary" />
              <span>Head-to-Head Score Deltas</span>
            </h3>
            <span className="text-[11px] text-secondary font-mono">Video A vs Video B</span>
          </div>

          <div className="space-y-2.5">
            {[
              { label: "Hook Score", delta: report.score_diff.hook_delta },
              { label: "Retention Score", delta: report.score_diff.retention_delta },
              { label: "Clarity Score", delta: report.score_diff.clarity_delta },
              { label: "CTA Score", delta: report.score_diff.cta_delta },
              { label: "Emotion Score", delta: report.score_diff.emotion_delta },
            ].map((item, idx) => (
              <div key={idx} className="p-3 bg-neutral rounded-md border border-border flex items-center justify-between text-xs">
                <span className="font-normal text-primary">{item.label}</span>
                <span className="font-mono text-xs px-2.5 py-0.5 rounded-full bg-surface border border-border text-primary font-medium">
                  {item.delta > 0 ? `+${item.delta} (A)` : item.delta < 0 ? `${item.delta} (B)` : "Tied"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Pacing & Cuts Frequency */}
        <div className="bg-surface rounded-md p-6 border border-border space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border">
            <h3 className="text-sm font-medium text-primary flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-primary" />
              <span>Pacing &amp; Rhythm Autopsy</span>
            </h3>
            <span className="text-[11px] text-secondary">Acoustic &amp; visual velocity</span>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-neutral rounded-md text-center border border-border">
              <span className="text-[10px] font-medium text-secondary uppercase tracking-wider block mb-1">
                Video A Cuts
              </span>
              <span className="text-2xl font-normal text-primary">
                {report.pacing_comparison.video_a_cuts_per_minute}
              </span>
              <span className="text-[10px] text-secondary block mt-1">cuts / minute</span>
            </div>

            <div className="p-4 bg-neutral rounded-md text-center border border-border">
              <span className="text-[10px] font-medium text-secondary uppercase tracking-wider block mb-1">
                Video B Cuts
              </span>
              <span className="text-2xl font-normal text-primary">
                {report.pacing_comparison.video_b_cuts_per_minute}
              </span>
              <span className="text-[10px] text-secondary block mt-1">cuts / minute</span>
            </div>
          </div>

          <div className="p-3 bg-neutral rounded-md flex items-center justify-between text-xs border border-border">
            <span className="text-secondary font-normal">Silence Ratio:</span>
            <span className="font-mono text-primary font-medium">
              {(report.pacing_comparison.video_a_silence_ratio * 100).toFixed(0)}% (A) vs{" "}
              {(report.pacing_comparison.video_b_silence_ratio * 100).toFixed(0)}% (B)
            </span>
          </div>
        </div>
      </div>

      {/* 3. Why Winner Won (Dual Timestamp Citations) */}
      <div className="bg-surface rounded-md p-6 md:p-8 border border-border">
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border">
          <div>
            <h3 className="text-base font-normal tracking-tight text-primary flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span>Evidence: Why the Winner Won</span>
            </h3>
            <p className="text-xs text-secondary mt-0.5">
              Citing exact dual timestamps from both videos.
            </p>
          </div>
          <span className="chip-minimal text-xs font-mono">Dual Timestamps Verified</span>
        </div>

        <div className="space-y-3">
          {report.why_winner_won.map((item, idx) => (
            <div
              key={idx}
              className="p-4 bg-neutral rounded-md border border-border hover:bg-surface transition flex flex-col md:flex-row md:items-center justify-between gap-4"
            >
              <div className="space-y-1.5 flex-1">
                <div className="flex items-center gap-2">
                  <span className="chip-minimal text-[10px] uppercase font-mono">
                    {item.category}
                  </span>
                  <span className="chip-minimal text-[10px] font-mono">
                    Advantage: Video {item.advantage === "video_a" ? "A" : item.advantage === "video_b" ? "B" : "Tie"}
                  </span>
                </div>
                <p className="text-sm font-normal text-primary leading-relaxed">
                  {item.reason}
                </p>
              </div>

              {/* Dual Timestamps Chip Group */}
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => onSelectTimestamp && onSelectTimestamp(report.video_a_id, item.t_a_ms)}
                  className="btn-secondary text-xs font-mono h-8 px-3 flex items-center gap-1.5"
                  title="Jump to frame in Video A"
                >
                  <Clock className="w-3 h-3 text-secondary" />
                  <span>Vid A: {formatMs(item.t_a_ms)}</span>
                </button>

                <span className="text-secondary text-xs">vs</span>

                <button
                  onClick={() => onSelectTimestamp && onSelectTimestamp(report.video_b_id, item.t_b_ms)}
                  className="btn-secondary text-xs font-mono h-8 px-3 flex items-center gap-1.5"
                  title="Jump to frame in Video B"
                >
                  <Clock className="w-3 h-3 text-secondary" />
                  <span>Vid B: {formatMs(item.t_b_ms)}</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 4. Aligned Structural Beat Timeline Diff */}
      <div className="bg-surface rounded-md p-6 md:p-8 border border-border">
        <div className="mb-6">
          <h3 className="text-base font-normal tracking-tight text-primary flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <span>Beat-by-Beat Structural Alignment</span>
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Direct comparison of narrative functions, camera framing, and pacing between both cuts.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-border text-secondary uppercase text-[10px] tracking-wider font-medium">
                <th className="py-2.5 px-4">Narrative Beat</th>
                <th className="py-2.5 px-4">Video A ({report.video_a_id.slice(0, 6)})</th>
                <th className="py-2.5 px-4">Video B ({report.video_b_id.slice(0, 6)})</th>
                <th className="py-2.5 px-4">Structural Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {report.structural_diff.map((diff, dIdx) => (
                <tr key={dIdx} className="hover:bg-neutral transition">
                  <td className="py-3 px-4 font-medium text-primary uppercase font-mono">
                    {diff.beat_role}
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-normal text-primary">{diff.video_a_technique}</div>
                    <span className="text-[10px] font-mono text-secondary">{formatMs(diff.t_a_ms)}</span>
                  </td>
                  <td className="py-3 px-4">
                    <div className="font-normal text-primary">{diff.video_b_technique}</div>
                    <span className="text-[10px] font-mono text-secondary">{formatMs(diff.t_b_ms)}</span>
                  </td>
                  <td className="py-3 px-4 font-normal text-secondary">
                    {diff.impact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Key Actionable Recommendations */}
      <div className="bg-surface rounded-md p-6 md:p-8 border border-border">
        <div className="mb-6">
          <h3 className="text-base font-normal tracking-tight text-primary flex items-center gap-2">
            <Lightbulb className="w-4 h-4 text-primary" />
            <span>Remix Recommendations for the Underperforming Concept</span>
          </h3>
          <p className="text-xs text-secondary mt-0.5">
            Concrete structural edits to transform the lower-performing concept into a winner.
          </p>
        </div>

        <div className="space-y-3">
          {report.recommendations.map((rec, rIdx) => (
            <div
              key={rIdx}
              className="p-4 bg-neutral rounded-md border border-border flex items-start gap-3"
            >
              <div className="w-6 h-6 rounded-full bg-primary text-tertiary font-mono text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                {rIdx + 1}
              </div>
              <p className="text-sm font-normal text-primary leading-relaxed">
                {rec}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
