"use client";

import React, { useState, useEffect } from "react";
import { Eye, Sparkles, Wand2, ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";

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
      desc: "ReelBrain watches your video at 4 frames per second in the crucial opening 3 seconds, measuring pacing, speech rhythm, and visual interrupts.",
      icon: Eye,
      pill: "4 fps Hook + 1 fps Body",
      metric: "00:00.0 - 00:03.0 Hook Window",
      tag: "Step 1: Ingest",
    },
    {
      step: 2,
      title: "See Why It Hooks People",
      subtitle: "Instant 3-Line Autopsy",
      desc: "Get an executive verdict explaining what stops the scroll, exact timestamps of drop-off risks, and actionable fixes.",
      icon: Sparkles,
      pill: "Grounded with Evidence",
      metric: "Stop Rate Score: 91/100",
      tag: "Step 2: Autopsy",
    },
    {
      step: 3,
      title: "Remix For Your Brand",
      subtitle: "1-Click Original Script",
      desc: "Type your product and target audience. ReelBrain reuses the storytelling blueprint to generate 3 ranked hooks, voiceover script, and shot list.",
      icon: Wand2,
      pill: "100% Original",
      metric: "3 Ranked Hooks + Script",
      tag: "Step 3: Remix",
    },
  ];

  // Auto-cycle through 3 steps every 5 seconds
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
    <div className="bg-surface rounded-md p-6 border border-border relative overflow-hidden flex flex-col justify-between text-primary">
      <div>
        {/* Top Header Badge */}
        <div className="flex items-center justify-between mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-mono bg-neutral border border-border text-primary">
            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
            <span>How ReelBrain Works</span>
          </div>

          <div className="text-xs text-secondary font-mono">
            <span>Step {activeStep + 1} of 3</span>
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
                className={`py-2 px-3 rounded-md text-left transition cursor-pointer border ${
                  isActive
                    ? "bg-neutral text-primary border-primary"
                    : "bg-surface text-secondary hover:text-primary border-border"
                }`}
              >
                <div className="text-[10px] font-mono uppercase text-secondary mb-0.5">
                  Step {s.step}
                </div>
                <div className="text-xs font-medium truncate text-primary">{s.title.split(" ")[0]} {s.title.split(" ")[1] || ""}</div>
                {isActive && isPlaying && (
                  <div className="w-full bg-border h-0.5 mt-1.5 rounded-full overflow-hidden">
                    <div className="h-full bg-primary transition-all duration-300" style={{ width: "100%" }} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Active Step Showcase Card */}
        <div className="bg-neutral rounded-md p-5 border border-border mb-6">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center flex-shrink-0 text-primary">
              <IconComponent className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="chip-minimal text-[10px] uppercase font-mono">
                  {current.tag}
                </span>
                <span className="text-xs text-secondary">{current.subtitle}</span>
              </div>
              <h3 className="text-base font-medium text-primary mb-1">{current.title}</h3>
              <p className="text-xs text-secondary leading-relaxed mb-3">{current.desc}</p>

              <div className="flex flex-wrap items-center gap-2">
                <span className="chip-minimal text-xs font-mono">
                  <CheckCircle2 className="w-3 h-3 text-primary" />
                  <span>{current.pill}</span>
                </span>
                <span className="chip-minimal text-xs font-mono">
                  {current.metric}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Footer Quick Summary */}
      <div className="pt-4 border-t border-border flex items-center justify-between text-xs text-secondary">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-primary" />
          <span>Local Engine • Private &amp; Secure</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setActiveStep((prev) => (prev + 1) % steps.length);
            setIsPlaying(false);
          }}
          className="text-primary font-medium hover:underline flex items-center gap-1 cursor-pointer"
        >
          <span>Next</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
