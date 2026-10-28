"use client";

import React from "react";
import {
  FileVideo,
  Film,
  Mic,
  Eye,
  Activity,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

export interface PipelineProgress {
  stage: string;
  progress_pct: number;
  message: string;
  error?: string | null;
}

interface IngestProgressCardProps {
  progress: PipelineProgress;
}

const STAGES = [
  { id: "ingest", label: "Normalize", icon: FileVideo, threshold: 25 },
  { id: "frames", label: "1fps & Cuts", icon: Film, threshold: 45 },
  { id: "transcribe", label: "Whisper AI", icon: Mic, threshold: 65 },
  { id: "ocr", label: "Vision OCR", icon: Eye, threshold: 80 },
  { id: "audio_features", label: "Acoustics", icon: Activity, threshold: 90 },
];

export function IngestProgressCard({ progress }: IngestProgressCardProps) {
  const currentPct = progress.progress_pct || 0;

  return (
    <div className="p-5 bg-surface rounded-md border border-border space-y-4 animate-fade-in shadow-sm">
      {/* Header with Pulse & Percentage */}
      <div className="flex items-center justify-between pb-1 border-b border-border/60">
        <div className="flex items-center gap-2.5">
          <div className="relative flex items-center justify-center w-3 h-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
          </div>
          <div>
            <span className="text-xs font-medium text-primary capitalize">
              {progress.stage.replace(/_/g, " ")} Pipeline
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-medium text-primary">
            {currentPct}%
          </span>
        </div>
      </div>

      {/* Sleek Smooth Progress Bar */}
      <div className="w-full h-1.5 bg-neutral border border-border rounded-full overflow-hidden">
        <div
          className="h-full bg-primary transition-all duration-300 ease-out"
          style={{ width: `${currentPct}%` }}
        />
      </div>

      {/* 5-Stage Stepper Pills */}
      <div className="grid grid-cols-5 gap-1.5 pt-1">
        {STAGES.map((step) => {
          const isDone = currentPct >= step.threshold;
          const isActive =
            currentPct < step.threshold &&
            (step === STAGES[0] || currentPct >= STAGES[STAGES.indexOf(step) - 1].threshold);

          return (
            <div
              key={step.id}
              className={`p-2 rounded-md border text-center transition-all flex flex-col items-center gap-1 ${
                isDone
                  ? "bg-neutral border-border text-primary"
                  : isActive
                  ? "bg-surface border-primary text-primary shadow-xs ring-1 ring-primary/10"
                  : "bg-surface/50 border-border/50 text-secondary/50"
              }`}
            >
              <div className="flex items-center justify-center w-4 h-4">
                {isDone ? (
                  <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                ) : (
                  React.createElement(step.icon, {
                    className: `w-3.5 h-3.5 ${isActive ? "animate-pulse text-primary" : "text-secondary/50"}`,
                  })
                )}
              </div>
              <span className="text-[10px] font-mono tracking-tight truncate w-full block">
                {step.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Live Terminal Log Line */}
      <div className="px-3 py-2 bg-neutral rounded border border-border flex items-center gap-2 text-[11px] font-mono text-secondary truncate">
        <span className="text-primary font-bold">&gt;</span>
        <span className="truncate">{progress.message || "Executing pipeline stage..."}</span>
      </div>
    </div>
  );
}
