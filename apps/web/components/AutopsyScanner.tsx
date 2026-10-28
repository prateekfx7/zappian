"use client";

import React, { useState, useEffect } from "react";
import {
  Sparkles,
  Activity,
  Layers,
  Clock,
  Film,
  Zap,
  CheckCircle2,
  Cpu,
  Eye,
  Volume2,
} from "lucide-react";

interface AutopsyScannerProps {
  durationS?: number;
  frameCount?: number;
  cutCount?: number;
}

const FORENSIC_PHASES = [
  {
    title: "Hook Thumb-Stop Audit",
    detail: "Measuring 0–3s opening visual entropy, speech latency & early scene cut tension",
    icon: Zap,
  },
  {
    title: "Retention & Cut Cadence",
    detail: "Analyzing scene cut frequency, duration distribution & viewer drop-off velocity",
    icon: Film,
  },
  {
    title: "Acoustic Energy & Speech WPM",
    detail: "Evaluating vocal delivery pace, RMS energy variance & dead-air silence ratios",
    icon: Volume2,
  },
  {
    title: "Neural OCR Text Coverage",
    detail: "Scanning keyframes for subtitles, captions, and title prominence",
    icon: Eye,
  },
  {
    title: "Evidentiary Frame Grounding",
    detail: "Validating timestamps against verified 1fps video keyframe boundaries",
    icon: Layers,
  },
  {
    title: "Performance Matrix Synthesis",
    detail: "Synthesizing 7-score matrix, contextual verdict, and prioritized fixes",
    icon: Sparkles,
  },
];

export function AutopsyScanner({ durationS = 15, frameCount = 15, cutCount = 4 }: AutopsyScannerProps) {
  const [activePhaseIndex, setActivePhaseIndex] = useState(0);
  const [progressPct, setProgressPct] = useState(12);

  useEffect(() => {
    const interval = setInterval(() => {
      setProgressPct((prev) => {
        if (prev >= 95) return 95;
        const next = prev + Math.floor(Math.random() * 8) + 4;
        return next > 95 ? 95 : next;
      });
    }, 450);

    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const phaseInterval = setInterval(() => {
      setActivePhaseIndex((prev) => (prev + 1) % FORENSIC_PHASES.length);
    }, 1200);

    return () => clearInterval(phaseInterval);
  }, []);

  return (
    <div className="bg-surface rounded-md p-8 md:p-12 border border-border text-center space-y-8 animate-fade-in max-w-2xl mx-auto shadow-sm">
      {/* 1. Radar Reticle & Scanner Animation */}
      <div className="relative w-32 h-32 mx-auto flex items-center justify-center">
        {/* Outer Pulsing Concentric Ring */}
        <div className="absolute inset-0 rounded-full border border-border animate-ping opacity-25" />

        {/* Concentric Grid Rings */}
        <div className="absolute inset-2 rounded-full border border-border" />
        <div className="absolute inset-6 rounded-full border border-border" />
        <div className="absolute inset-10 rounded-full border border-border/80" />

        {/* Crosshair Lines */}
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-[1px] bg-border" />
        <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-[1px] bg-border" />

        {/* Rotating Radar Sweep Needle */}
        <div className="absolute inset-0 flex items-center justify-center animate-spin" style={{ animationDuration: "2.4s" }}>
          <div className="w-[1px] h-14 bg-gradient-to-t from-primary to-transparent origin-bottom -translate-y-7" />
        </div>

        {/* Center Target Core */}
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-tertiary relative z-10 shadow-sm">
          <Cpu className="w-5 h-5 animate-pulse" />
        </div>
      </div>

      {/* 2. Headline & Dynamic Percentage */}
      <div className="space-y-2">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono font-medium bg-neutral border border-border text-primary">
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span>DECONSTRUCTING FORENSICS • {progressPct}%</span>
        </div>
        <h3 className="text-xl md:text-2xl font-normal tracking-tight text-primary">
          Synthesizing Forensic Autopsy
        </h3>
        <p className="text-xs text-secondary max-w-md mx-auto">
          Extracting empirical hold power across {frameCount} frames, {cutCount} scene cuts, and acoustic curves.
        </p>
      </div>

      {/* 3. Smooth Progress Bar */}
      <div className="w-full max-w-md mx-auto space-y-1.5">
        <div className="w-full h-1.5 bg-neutral border border-border rounded-full overflow-hidden">
          <div
            className="h-full bg-primary transition-all duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
        <div className="flex justify-between text-[11px] font-mono text-secondary">
          <span>Stage {activePhaseIndex + 1} of {FORENSIC_PHASES.length}</span>
          <span>{progressPct}% Completed</span>
        </div>
      </div>

      {/* 4. Active Forensic Phase Card */}
      <div className="p-4 bg-neutral rounded-md border border-border text-left max-w-md mx-auto flex items-start gap-3.5 transition-all">
        <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-primary flex-shrink-0 mt-0.5">
          {React.createElement(FORENSIC_PHASES[activePhaseIndex].icon, {
            className: "w-4 h-4",
          })}
        </div>
        <div className="space-y-1 overflow-hidden">
          <div className="text-xs font-medium text-primary flex items-center gap-2">
            <span>{FORENSIC_PHASES[activePhaseIndex].title}</span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 bg-surface border border-border rounded text-secondary">
              Active
            </span>
          </div>
          <p className="text-[11px] text-secondary leading-relaxed truncate">
            {FORENSIC_PHASES[activePhaseIndex].detail}
          </p>
        </div>
      </div>

      {/* 5. Audio Waveform Simulator Bars */}
      <div className="flex items-center justify-center gap-1.5 h-6">
        {[4, 12, 18, 8, 22, 14, 10, 24, 16, 9, 20, 6].map((h, i) => (
          <div
            key={i}
            className="w-1 bg-primary/80 rounded-full transition-all duration-300"
            style={{
              height: `${Math.max(4, (h * (progressPct % 5 + 1)) % 24)}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
