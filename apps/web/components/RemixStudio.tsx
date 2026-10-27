"use client";

import React, { useState } from "react";
import {
  Sparkles,
  ShieldCheck,
  Flame,
  FileText,
  Lock,
  Layers,
  Copy,
  Check,
  Video,
  Play,
  ArrowRight,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
} from "lucide-react";

export interface RemixConcept {
  concept_id: string;
  source_video_id: string;
  product_or_topic: string;
  target_audience: string;
  platform: string;
  hooks: {
    rank: number;
    type: string;
    text: string;
    visual_cue: string;
    expected_retention: string;
  }[];
  selected_hook_index: number;
  spoken_script: string;
  style_lock: string;
  shots: {
    shot_index: number;
    t_start_s: number;
    duration_s: number;
    shot_type: string;
    camera_motion: string;
    description: string;
    on_screen_text: string;
    prompt_ltx: string;
    prompt_wan: string;
  }[];
  originality: {
    status: "passed" | "warning" | "failed" | string;
    text_overlap_pct: number;
    max_consecutive_words: number;
    visual_similarity_score: number;
    concept_judge: {
      passed: boolean;
      premise_diff: string;
      setting_diff: string;
      characters_diff: string;
      metaphor_diff: string;
      reason: string;
    };
  };
}

interface RemixStudioProps {
  sourceVideoId: string;
  onGenerationReady?: (conceptId: string) => void;
}

export function RemixStudio({ sourceVideoId, onGenerationReady }: RemixStudioProps) {
  const [productOrTopic, setProductOrTopic] = useState("");
  const [targetAudience, setTargetAudience] = useState("remote workers & creators");
  const [platform, setPlatform] = useState<"tiktok" | "reels" | "youtube_shorts">("reels");
  const [durationS, setDurationS] = useState(30);
  const [goal, setGoal] = useState("conversions");
  const [tone, setTone] = useState("energetic");
  const [customStyleLock, setCustomStyleLock] = useState("");

  const [isGenerating, setIsGenerating] = useState(false);
  const [concept, setConcept] = useState<RemixConcept | null>(null);
  const [selectedHookIndex, setSelectedHookIndex] = useState(0);
  const [editableScript, setEditableScript] = useState("");
  const [editableStyleLock, setEditableStyleLock] = useState("");
  const [copiedShotIndex, setCopiedShotIndex] = useState<number | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleGenerateConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productOrTopic.trim()) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setGenerationMessage(null);

    try {
      const res = await fetch("http://localhost:8000/v1/concepts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_video_id: sourceVideoId,
          product_or_topic: productOrTopic.trim(),
          target_audience: targetAudience.trim(),
          platform: platform,
          target_duration_s: durationS,
          goal: goal,
          tone: tone,
          custom_style_lock: customStyleLock.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to generate remix concept.");
      }

      const data: RemixConcept = await res.json();
      setConcept(data);
      setSelectedHookIndex(data.selected_hook_index || 0);
      setEditableScript(data.spoken_script);
      setEditableStyleLock(data.style_lock);
    } catch (err: any) {
      setErrorMessage(err.message || "Remix engine failed. Verify the video has been analyzed.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyPrompt = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedShotIndex(index);
    setTimeout(() => setCopiedShotIndex(null), 2000);
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(editableScript);
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2000);
  };

  const handleTriggerGeneration = async () => {
    if (!concept) return;

    try {
      const res = await fetch(`http://localhost:8000/v1/concepts/${concept.concept_id}/generate`, {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Generation gate rejected the concept.");
      }

      const data = await res.json();
      setGenerationMessage(data.message || "Concept approved for draft generation.");
      if (onGenerationReady) onGenerationReady(concept.concept_id);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to trigger generation.");
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      {/* 1. Header Banner */}
      <div className="bg-white rounded-pin-lg p-8 border border-hairline shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-hairline gap-4 mb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Phase 4: Structure Remix &amp; Originality Check</span>
            </div>
            <h2 className="text-2xl md:text-3xl font-extrabold text-ink tracking-tight">
              Remix Concept Studio
            </h2>
            <p className="text-xs text-mute font-mono">
              Extracting structure &amp; pacing from source video: {sourceVideoId.slice(0, 8)}...
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="pill-overlay text-xs flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Rule 4: Not A Copy</span>
            </span>
          </div>
        </div>

        {/* Concept Input Form */}
        <form onSubmit={handleGenerateConcept} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                New Product or Topic to Sell
              </label>
              <input
                type="text"
                value={productOrTopic}
                onChange={(e) => setProductOrTopic(e.target.value)}
                placeholder="e.g. Minimalist Ceramic Coffee Tumbler"
                className="w-full bg-surface-card border border-stone rounded-xl py-3 px-4 text-xs font-semibold text-ink outline-none focus:border-primary transition"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                Target Audience &amp; Persona
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Busy commuters and coffee lovers"
                className="w-full bg-surface-card border border-stone rounded-xl py-3 px-4 text-xs font-semibold text-ink outline-none focus:border-primary transition"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-mute mb-1">
                Platform
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as any)}
                className="w-full bg-surface-card border border-stone rounded-xl py-2 px-3 text-xs text-ink outline-none focus:border-primary font-medium"
              >
                <option value="reels">Instagram Reels (9:16)</option>
                <option value="tiktok">TikTok (9:16)</option>
                <option value="youtube_shorts">YouTube Shorts (9:16)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-mute mb-1">
                Duration
              </label>
              <select
                value={durationS}
                onChange={(e) => setDurationS(parseInt(e.target.value))}
                className="w-full bg-surface-card border border-stone rounded-xl py-2 px-3 text-xs text-ink outline-none focus:border-primary font-medium"
              >
                <option value={15}>15 Seconds (Rapid)</option>
                <option value={30}>30 Seconds (Standard)</option>
                <option value={45}>45 Seconds (Deep Demo)</option>
                <option value={60}>60 Seconds (Full Pitch)</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-mute mb-1">
                Primary Goal
              </label>
              <select
                value={goal}
                onChange={(e) => setGoal(e.target.value)}
                className="w-full bg-surface-card border border-stone rounded-xl py-2 px-3 text-xs text-ink outline-none focus:border-primary font-medium"
              >
                <option value="conversions">Direct Sales / Conversions</option>
                <option value="awareness">Brand Viral Awareness</option>
                <option value="lead_gen">Waitlist / Lead Gen</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold uppercase tracking-wider text-mute mb-1">
                Tone &amp; Vibe
              </label>
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value)}
                className="w-full bg-surface-card border border-stone rounded-xl py-2 px-3 text-xs text-ink outline-none focus:border-primary font-medium"
              >
                <option value="energetic">Energetic &amp; Snappy</option>
                <option value="minimalist">Minimalist &amp; Clean</option>
                <option value="humorous">Humorous &amp; Relatable</option>
                <option value="premium">Ultra Premium &amp; Luxury</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-hairline">
            <span className="text-xs text-mute">
              Reuses pacing and psychological beat triggers only. 100% original narrative and footage.
            </span>

            <button
              type="submit"
              disabled={isGenerating || !productOrTopic.trim()}
              className="btn-primary flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4" />
              <span>{isGenerating ? "Synthesizing Original Concept..." : "Generate Remix Concept"}</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-rose-50 text-rose-800 text-xs font-medium rounded-pin border border-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </form>
      </div>

      {/* 2. Concept Results & Originality Audit Display */}
      {concept && (
        <div className="space-y-8 animate-fade-in">
          {/* A. Originality Audit Badge */}
          <div className="bg-white rounded-pin-lg p-6 border border-hairline shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-hairline gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
                    concept.originality.status === "passed"
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-rose-100 text-rose-800"
                  }`}
                >
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                    <span>Originality Audit: </span>
                    <span
                      className={`uppercase text-sm px-2.5 py-0.5 rounded-full font-extrabold ${
                        concept.originality.status === "passed"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {concept.originality.status}
                    </span>
                  </h3>
                  <p className="text-xs text-mute">
                    Audited per Rule 4 against source footage, script, and premise.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <div className="p-2 bg-surface-card rounded-xl border border-hairline text-center min-w-[100px]">
                  <span className="text-[10px] text-mute block uppercase">5-Gram Overlap</span>
                  <span className="font-extrabold text-ink">{concept.originality.text_overlap_pct}%</span>
                </div>
                <div className="p-2 bg-surface-card rounded-xl border border-hairline text-center min-w-[100px]">
                  <span className="text-[10px] text-mute block uppercase">Max Run Words</span>
                  <span className="font-extrabold text-ink">{concept.originality.max_consecutive_words}</span>
                </div>
                <div className="p-2 bg-surface-card rounded-xl border border-hairline text-center min-w-[100px]">
                  <span className="text-[10px] text-mute block uppercase">Visual Similarity</span>
                  <span className="font-extrabold text-ink">{concept.originality.visual_similarity_score}</span>
                </div>
              </div>
            </div>

            {/* Concept Judge Diff Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
              <div className="p-3 bg-surface-card rounded-pin">
                <span className="font-bold text-mute uppercase text-[10px] block mb-1">Premise Diff</span>
                <span className="text-ink font-medium">{concept.originality.concept_judge.premise_diff}</span>
              </div>
              <div className="p-3 bg-surface-card rounded-pin">
                <span className="font-bold text-mute uppercase text-[10px] block mb-1">Setting Diff</span>
                <span className="text-ink font-medium">{concept.originality.concept_judge.setting_diff}</span>
              </div>
              <div className="p-3 bg-surface-card rounded-pin">
                <span className="font-bold text-mute uppercase text-[10px] block mb-1">Characters Diff</span>
                <span className="text-ink font-medium">{concept.originality.concept_judge.characters_diff}</span>
              </div>
              <div className="p-3 bg-surface-card rounded-pin">
                <span className="font-bold text-mute uppercase text-[10px] block mb-1">Metaphor Diff</span>
                <span className="text-ink font-medium">{concept.originality.concept_judge.metaphor_diff}</span>
              </div>
            </div>

            <p className="text-xs text-mute italic">
              <strong>Judge Ruling:</strong> {concept.originality.concept_judge.reason}
            </p>
          </div>

          {/* B. 3 Ranked Hooks Picker */}
          <div className="bg-white rounded-pin-lg p-6 border border-hairline shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" />
                <span>Choose Your Opening Hook (3 Distinct Angles)</span>
              </h3>
              <p className="text-xs text-mute">
                Select the hook angle that best fits your creator persona.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {concept.hooks.map((h, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedHookIndex(idx)}
                  className={`card-pin p-5 cursor-pointer transition border-2 flex flex-col justify-between ${
                    selectedHookIndex === idx
                      ? "border-primary shadow-sm bg-primary/5"
                      : "border-hairline hover:border-stone"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-black uppercase text-primary">
                        Hook #{h.rank}: {h.type}
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                        {h.expected_retention}
                      </span>
                    </div>

                    <p className="text-sm font-bold text-ink mb-3 leading-snug">
                      "{h.text}"
                    </p>
                  </div>

                  <div className="pt-2 border-t border-hairline/80 text-[11px] text-mute">
                    <strong>Visual Cue:</strong> {h.visual_cue}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* C. Continuous Spoken Script (Rule 21) */}
          <div className="bg-white rounded-pin-lg p-6 border border-hairline shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Continuous Spoken Voiceover Script</span>
                </h3>
                <p className="text-xs text-mute">
                  Rule 21 Compliant: Single flowing spoken paragraph. Zero section labels inside audio text.
                </p>
              </div>

              <button
                onClick={handleCopyScript}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold bg-surface-card hover:bg-secondary-bg text-ink border border-hairline flex items-center gap-1.5 transition cursor-pointer"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? "Copied" : "Copy Script"}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={editableScript}
              onChange={(e) => setEditableScript(e.target.value)}
              className="w-full p-4 bg-surface-card border border-stone rounded-pin text-sm text-ink leading-relaxed outline-none focus:border-primary font-medium"
            />
          </div>

          {/* D. Style Lock Editor (Rule 22) */}
          <div className="bg-white rounded-pin-lg p-6 border border-hairline shadow-sm">
            <div className="mb-3">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <span>Style Lock Block (Appended to Every Shot Prompt)</span>
              </h3>
              <p className="text-xs text-mute">
                Rule 22 Compliant: Consistent palette, lighting, camera moves, and subject lock.
              </p>
            </div>

            <textarea
              rows={2}
              value={editableStyleLock}
              onChange={(e) => setEditableStyleLock(e.target.value)}
              className="w-full p-3 bg-surface-card border border-stone rounded-xl text-xs font-mono text-ink leading-relaxed outline-none focus:border-primary"
            />
          </div>

          {/* E. Beat-by-Beat Shot List with Prompts */}
          <div className="bg-white rounded-pin-lg p-6 border border-hairline shadow-sm">
            <div className="mb-4">
              <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Planned Shot List ({concept.shots.length} Shots)</span>
              </h3>
              <p className="text-xs text-mute">
                Formatted prompts for LTX-2 &amp; Wan 2.2 with embedded Style Lock.
              </p>
            </div>

            <div className="space-y-4">
              {concept.shots.map((shot, sIdx) => (
                <div
                  key={sIdx}
                  className="p-4 bg-surface-card rounded-pin border border-hairline space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full bg-ink text-white font-extrabold uppercase text-[10px]">
                        Shot #{shot.shot_index}
                      </span>
                      <span className="font-bold text-ink">
                        {shot.shot_type} • {shot.camera_motion}
                      </span>
                      <span className="font-mono text-mute">
                        ({shot.duration_s}s)
                      </span>
                    </div>

                    {shot.on_screen_text && (
                      <span className="pill-overlay text-[10px] font-bold">
                        OCR: "{shot.on_screen_text}"
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-body leading-relaxed">
                    {shot.description}
                  </p>

                  {/* Model Prompts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-hairline text-xs font-mono">
                    <div className="p-3 bg-white rounded-xl border border-hairline flex flex-col justify-between">
                      <div className="text-[10px] font-bold uppercase text-primary mb-1">
                        LTX-2 Prompt (Draft Mode)
                      </div>
                      <p className="text-[11px] text-mute line-clamp-2 mb-2">
                        {shot.prompt_ltx}
                      </p>
                      <button
                        onClick={() => handleCopyPrompt(shot.prompt_ltx, sIdx * 2)}
                        className="self-end px-3 py-1 rounded-full text-[10px] font-bold bg-surface-card hover:bg-secondary-bg text-ink border border-hairline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedShotIndex === sIdx * 2 ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedShotIndex === sIdx * 2 ? "Copied" : "Copy LTX"}</span>
                      </button>
                    </div>

                    <div className="p-3 bg-white rounded-xl border border-hairline flex flex-col justify-between">
                      <div className="text-[10px] font-bold uppercase text-ink mb-1">
                        Wan 2.2 Prompt (Quality Mode)
                      </div>
                      <p className="text-[11px] text-mute line-clamp-2 mb-2">
                        {shot.prompt_wan}
                      </p>
                      <button
                        onClick={() => handleCopyPrompt(shot.prompt_wan, sIdx * 2 + 1)}
                        className="self-end px-3 py-1 rounded-full text-[10px] font-bold bg-surface-card hover:bg-secondary-bg text-ink border border-hairline flex items-center gap-1 cursor-pointer"
                      >
                        {copiedShotIndex === sIdx * 2 + 1 ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedShotIndex === sIdx * 2 + 1 ? "Copied" : "Copy Wan"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* F. Action Bar: Ready for Generation */}
          <div className="p-6 bg-surface-card rounded-pin border border-hairline flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-bold text-ink">
                Originality Check Passed • Concept Approved
              </h4>
              <p className="text-xs text-mute">
                Proceed to draft generation using open-source LTX-2 or Wan 2.2 providers.
              </p>
            </div>

            <button
              onClick={handleTriggerGeneration}
              className="btn-primary flex items-center gap-2 cursor-pointer shadow-sm"
            >
              <Video className="w-4 h-4" />
              <span>Queue Video Generation (Phase 5)</span>
            </button>
          </div>

          {generationMessage && (
            <div className="p-4 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-pin border border-emerald-200 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
              <span>{generationMessage}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
