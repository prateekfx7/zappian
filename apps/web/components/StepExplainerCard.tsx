"use client";

import React, { useState, useEffect } from "react";
import { Eye, Sparkles, Wand2, ArrowRight, Play, CheckCircle2, ShieldCheck } from "lucide-react";

interface StepExplainerCardProps {
  onTrySample?: () => void;
}

export function StepExplainerCard({ onTrySample }: StepExplainerCardProps) {
  const [activeStep, setActiveStep] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);

  const steps = [
    {
      step: 1,
      title: "Drop Any Reel or TikTok",
      subtitle: "Frame-by-Frame AI Ingest",
      desc: "ReelBrain watches your video at 4 frames per second in the crucial opening 3 seconds, measuring pacing, speech pacing, and visual pattern interrupts.",
      icon: Eye,
      pill: "4 fps Hook + 1 fps Body",
      metric: "00:00.0 - 00:03.0 Hook Window",
      tag: "Step 1: Watch & Measure",
    },
    {
      step: 2,
      title: "See Why It Hooks People",
      subtitle: "Instant 3-Line Autopsy",
      desc: "Get an executive verdict explaining what stops the scroll, exact timestamps of drop-off risks (like dead air or text covered by TikTok UI), and 3 quick fixes.",
      icon: Sparkles,
      pill: "Grounded with Evidence",
      metric: "Stop Rate Score: 91/100",
      tag: "Step 2: Understand The Why",
    },
    {
      step: 3,
      title: "Remix For Your Brand",
      subtitle: "1-Click Original Script",
      desc: "Type your product and target audience. ReelBrain reuses the winning storytelling blueprint to generate 3 ranked hooks, a continuous voiceover script, and a shot list.",
      icon: Wand2,
      pill: "100% Original (0% Copied)",
      metric: "3 Ranked Hooks + Continuous Script",
      tag: "Step 3: 1-Click Remix",
    },
  ];

  // Auto-cycle through 3 steps every 5 seconds (15-second complete cycle)
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      setActiveStep((prev) => (prev + 1) % steps.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPlaying, steps.length]);

  const current = steps[activeStep];
  const IconComponent = current.icon;

  return (
    <div className="bg-surface-card rounded-pin-lg p-6 md:p-8 border border-hairline/80 shadow-sm relative overflow-hidden flex flex-col justify-between">
      {/* Background ambient glow */}
      <div className="absolute top-0 right-0 w-48 h-48 bg-primary/5 rounded-full blur-2xl pointer-events-none" />

      <div>
        {/* Top Header Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-white text-ink border border-hairline shadow-xs">
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>How ReelBrain Works</span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-mute font-semibold">
            <span>15-Second Animated Tour</span>
          </div>
        </div>

        {/* 3 Step Indicator Tabs */}
        <div className="grid grid-cols-3 gap-2 mb-6">
          {steps.map((s, idx) => {
            const isActive = activeStep === idx;
            return (
              <button
                key={s.step}
                type="button"
                onClick={() => {
                  setActiveStep(idx);
                  setIsPlaying(false);
                }}
                className={`py-2 px-3 rounded-xl text-left transition-all ${
                  isActive
                    ? "bg-white text-ink shadow-sm border border-hairline scale-[1.02]"
                    : "bg-secondary-bg/60 text-mute hover:bg-secondary-bg"
                }`}
              >
                <div className="text-[10px] font-bold uppercase tracking-wider text-mute mb-0.5">
                  Step {s.step}
                </div>
                <div className="text-xs font-bold truncate text-ink">{s.title.split(" ")[0]} {s.title.split(" ")[1] || ""}</div>
                {/* Progress bar inside active step */}
                {isActive && isPlaying && (
                  <div className="w-full bg-primary/20 h-0.5 mt-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary animate-[progress_5s_linear]" />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Step Showcase Card */}
        <div className="bg-white rounded-pin p-6 border border-hairline shadow-xs mb-6 transition-all duration-300">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center flex-shrink-0 text-primary">
              <IconComponent className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-primary">
                  {current.tag}
                </span>
                <span className="text-hairline">•</span>
                <span className="text-xs font-semibold text-mute">{current.subtitle}</span>
              </div>
              <h3 className="text-lg md:text-xl font-bold text-ink mb-2">{current.title}</h3>
              <p className="text-xs md:text-sm text-body leading-relaxed mb-4">{current.desc}</p>

              {/* Visual Highlight Metric Pill */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-surface-card text-ink border border-hairline">
                  <CheckCircle2 className="w-3.5 h-3.5 text-semantic-successDeep" />
                  <span>{current.pill}</span>
                </span>
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-mono font-semibold bg-primary/5 text-primary border border-primary/20">
                  {current.metric}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Quick Summary */}
      <div className="pt-4 border-t border-hairline/80 flex items-center justify-between text-xs text-mute">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-semantic-successDeep" />
          <span>100% Offline Local AI • Safe for Client Videos</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setActiveStep((prev) => (prev + 1) % steps.length);
            setIsPlaying(false);
          }}
          className="text-primary font-bold hover:underline flex items-center gap-1"
        >
          <span>Next Step</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
