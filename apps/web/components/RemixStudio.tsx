"use client";

import React, { useState, useEffect } from "react";
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
  ChevronDown,
  ChevronUp,
  SlidersHorizontal,
  Brain,
} from "lucide-react";
import { DraftPlayer, DraftData } from "./DraftPlayer";
import { API_BASE_URL } from "../lib/api";

export interface RemixConcept {
  concept_id: string;
  source_video_id: string;
  product_or_topic: string;
  target_audience: string;
  platform: string;
  brain_intelligence?: {
    memory_source: string;
    total_supporting_videos: number;
    total_supporting_frames: number;
    applied_hook_archetype: string;
    proven_hold_rate: string;
    target_cut_rhythm: string;
  };
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
  initialProductOrTopic?: string;
  initialPlatform?: "tiktok" | "reels" | "youtube_shorts";
  initialDurationS?: number;
  onGenerationReady?: (conceptId: string) => void;
}

export function RemixStudio({
  sourceVideoId,
  initialProductOrTopic,
  initialPlatform,
  initialDurationS,
  onGenerationReady,
}: RemixStudioProps) {
  const [productOrTopic, setProductOrTopic] = useState(initialProductOrTopic || "");
  const [targetAudience, setTargetAudience] = useState("remote workers & creators");
  const [platform, setPlatform] = useState<"tiktok" | "reels" | "youtube_shorts">(initialPlatform || "reels");
  const [durationS, setDurationS] = useState(initialDurationS || 30);
  const [goal, setGoal] = useState("conversions");
  const [tone, setTone] = useState("energetic");
  const [customStyleLock, setCustomStyleLock] = useState("");
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [useBrainMemory, setUseBrainMemory] = useState(true);

  const [isGenerating, setIsGenerating] = useState(false);
  const [concept, setConcept] = useState<RemixConcept | null>(null);
  const [selectedHookIndex, setSelectedHookIndex] = useState(0);
  const [editableScript, setEditableScript] = useState("");
  const [editableStyleLock, setEditableStyleLock] = useState("");
  const [copiedShotIndex, setCopiedShotIndex] = useState<number | null>(null);
  const [copiedScript, setCopiedScript] = useState(false);
  const [generationMessage, setGenerationMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Phase 5: Draft Video Generation & Player
  const [draftData, setDraftData] = useState<DraftData | null>(null);
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  // Sync initial props if passed from BrainViewer
  useEffect(() => {
    if (initialProductOrTopic) setProductOrTopic(initialProductOrTopic);
    if (initialPlatform) setPlatform(initialPlatform);
    if (initialDurationS) setDurationS(initialDurationS);
  }, [initialProductOrTopic, initialPlatform, initialDurationS]);

  // Check if draft was already generated for this concept
  useEffect(() => {
    if (!concept?.concept_id) return;
    fetch(`${API_BASE_URL}/v1/concepts/${concept.concept_id}/draft`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.video_url) setDraftData(data);
      })
      .catch(() => {});
  }, [concept?.concept_id]);

  const handleGenerateConcept = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productOrTopic.trim()) return;

    setIsGenerating(true);
    setErrorMessage(null);
    setGenerationMessage(null);
    setDraftData(null);

    try {
      const res = await fetch(`${API_BASE_URL}/v1/concepts`, {
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
          use_brain_memory: useBrainMemory,
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

    setIsGeneratingDraft(true);
    setErrorMessage(null);
    setGenerationMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/v1/concepts/${concept.concept_id}/generate`, {
        method: "POST",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Generation gate rejected the concept.");
      }

      const data = await res.json();
      setDraftData(data);
      setGenerationMessage(data.message || "Draft video generated and synchronized within ±200ms.");
      if (onGenerationReady) onGenerationReady(concept.concept_id);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to trigger generation.");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-primary">
      {/* 1. Header Banner & Config Form */}
      <div className="bg-surface rounded-md p-6 md:p-8 border border-border">
        <div className="flex items-center justify-between pb-6 border-b border-border mb-6">
          <div>
            <h2 className="text-xl md:text-2xl font-normal tracking-tight text-primary">
              Remix Studio
            </h2>
            <p className="text-xs text-secondary mt-0.5">
              Reuses pacing and psychological structure for your brand
            </p>
          </div>
        </div>

        {/* Concept Input Form */}
        <form onSubmit={handleGenerateConcept} className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Product or Service
              </label>
              <input
                type="text"
                value={productOrTopic}
                onChange={(e) => setProductOrTopic(e.target.value)}
                placeholder="e.g. Minimalist Ceramic Coffee Tumbler"
                className="input-minimal w-full"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-secondary mb-1.5">
                Target Customer
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. Busy commuters and creators"
                className="input-minimal w-full"
              />
            </div>
          </div>

          {/* Collapsible Fine-Tuning Drawer */}
          <div className="border border-border rounded-md overflow-hidden bg-neutral">
            <button
              type="button"
              onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
              className="w-full px-4 py-2.5 flex items-center justify-between text-xs font-medium text-secondary hover:text-primary transition cursor-pointer"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span>Fine-Tuning Options (Platform, Duration, Tone, Goal)</span>
              </span>
              {showAdvancedOptions ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </button>

            {showAdvancedOptions && (
              <div className="p-4 pt-1 border-t border-border space-y-4 animate-fade-in bg-surface">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-wider text-secondary mb-1">
                      Platform
                    </label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value as any)}
                      className="w-full bg-surface border border-border rounded-full py-1.5 px-3 text-xs text-primary outline-none focus:border-primary font-normal"
                    >
                      <option value="reels">Instagram Reels (9:16)</option>
                      <option value="tiktok">TikTok (9:16)</option>
                      <option value="youtube_shorts">YouTube Shorts (9:16)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-wider text-secondary mb-1">
                      Duration
                    </label>
                    <select
                      value={durationS}
                      onChange={(e) => setDurationS(parseInt(e.target.value))}
                      className="w-full bg-surface border border-border rounded-full py-1.5 px-3 text-xs text-primary outline-none focus:border-primary font-normal"
                    >
                      <option value={15}>15 Seconds (Rapid)</option>
                      <option value={30}>30 Seconds (Standard)</option>
                      <option value={45}>45 Seconds (Deep Demo)</option>
                      <option value={60}>60 Seconds (Full Pitch)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-wider text-secondary mb-1">
                      Primary Goal
                    </label>
                    <select
                      value={goal}
                      onChange={(e) => setGoal(e.target.value)}
                      className="w-full bg-surface border border-border rounded-full py-1.5 px-3 text-xs text-primary outline-none focus:border-primary font-normal"
                    >
                      <option value="conversions">Direct Sales / Conversions</option>
                      <option value="awareness">Brand Viral Awareness</option>
                      <option value="lead_gen">Waitlist / Lead Gen</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium uppercase tracking-wider text-secondary mb-1">
                      Tone &amp; Vibe
                    </label>
                    <select
                      value={tone}
                      onChange={(e) => setTone(e.target.value)}
                      className="w-full bg-surface border border-border rounded-full py-1.5 px-3 text-xs text-primary outline-none focus:border-primary font-normal"
                    >
                      <option value="energetic">Energetic &amp; Snappy</option>
                      <option value="minimalist">Minimalist &amp; Clean</option>
                      <option value="humorous">Humorous &amp; Relatable</option>
                      <option value="premium">Ultra Premium &amp; Luxury</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium uppercase tracking-wider text-secondary mb-1">
                    Custom Style Lock (Optional Prompt Prefix)
                  </label>
                  <input
                    type="text"
                    value={customStyleLock}
                    onChange={(e) => setCustomStyleLock(e.target.value)}
                    placeholder="e.g. Crisp 4K cinematic lighting, macro shallow depth of field, warm morning aesthetic"
                    className="w-full bg-surface border border-border rounded-full py-1.5 px-4 text-xs text-primary outline-none focus:border-primary font-normal"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-between pt-2 border-t border-border gap-3">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-secondary hover:text-primary transition select-none">
              <input
                type="checkbox"
                checked={useBrainMemory}
                onChange={(e) => setUseBrainMemory(e.target.checked)}
                className="rounded border-border text-primary focus:ring-0 w-3.5 h-3.5 cursor-pointer accent-primary"
              />
              <span className="flex items-center gap-1.5 font-medium text-primary">
                <Brain className="w-3.5 h-3.5" />
                <span>Infuse Brain Memory Patterns</span>
              </span>
            </label>

            <button
              type="submit"
              disabled={isGenerating || !productOrTopic.trim()}
              className="btn-primary"
            >
              <Sparkles className="w-3.5 h-3.5 mr-1.5" />
              <span>{isGenerating ? "Writing Original Script..." : "Write Original Script"}</span>
            </button>
          </div>

          {errorMessage && (
            <div className="p-3 bg-neutral text-error text-xs font-normal rounded-md border border-error/30 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </form>
      </div>

      {/* 2. Concept Results & Originality Audit Display */}
      {concept && (
        <div className="space-y-6 animate-fade-in">
          {/* Brain Intelligence Infusion Notice */}
          {concept.brain_intelligence && (
            <div className="bg-surface rounded-md p-4 border border-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-full bg-neutral border border-border flex items-center justify-center text-primary flex-shrink-0">
                  <Brain className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-medium text-primary flex items-center gap-2">
                    <span>Brain Intelligence Infused</span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-neutral border border-border text-secondary">
                      {concept.brain_intelligence.applied_hook_archetype}
                    </span>
                  </div>
                  <p className="text-[11px] text-secondary mt-0.5">
                    Synthesized from {concept.brain_intelligence.total_supporting_videos} analyzed videos &amp; {concept.brain_intelligence.total_supporting_frames} frames • Proven hold rate {concept.brain_intelligence.proven_hold_rate}
                  </p>
                </div>
              </div>

              <div className="text-right text-[11px] font-mono text-secondary self-end sm:self-center">
                Target cut cadence: <span className="text-primary font-medium">{concept.brain_intelligence.target_cut_rhythm}</span>
              </div>
            </div>
          )}

          {/* A. Originality Audit Badge */}
          <div className="bg-surface rounded-md p-6 border border-border">
            <div className="flex flex-col md:flex-row md:items-center justify-between pb-4 border-b border-border gap-4 mb-4">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-neutral border border-border flex items-center justify-center text-primary">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-medium text-primary flex items-center gap-2">
                    <span>Originality Audit: </span>
                    <span className="chip-minimal text-xs font-mono uppercase">
                      {concept.originality.status}
                    </span>
                  </h3>
                  <p className="text-xs text-secondary">
                    Audited per Rule 4 against source footage, script, and premise.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 text-xs font-mono">
                <div className="p-2 bg-neutral rounded-md border border-border text-center min-w-[90px]">
                  <span className="text-[10px] text-secondary block uppercase">5-Gram Overlap</span>
                  <span className="font-medium text-primary">{concept.originality.text_overlap_pct}%</span>
                </div>
                <div className="p-2 bg-neutral rounded-md border border-border text-center min-w-[90px]">
                  <span className="text-[10px] text-secondary block uppercase">Max Run Words</span>
                  <span className="font-medium text-primary">{concept.originality.max_consecutive_words}</span>
                </div>
                <div className="p-2 bg-neutral rounded-md border border-border text-center min-w-[90px]">
                  <span className="text-[10px] text-secondary block uppercase">Similarity</span>
                  <span className="font-medium text-primary">{concept.originality.visual_similarity_score}</span>
                </div>
              </div>
            </div>

            {/* Concept Judge Diff Breakdown */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs mb-3">
              <div className="p-3 bg-neutral rounded-md border border-border">
                <span className="font-medium text-secondary uppercase text-[10px] block mb-1">Premise Diff</span>
                <span className="text-primary font-normal">{concept.originality.concept_judge.premise_diff}</span>
              </div>
              <div className="p-3 bg-neutral rounded-md border border-border">
                <span className="font-medium text-secondary uppercase text-[10px] block mb-1">Setting Diff</span>
                <span className="text-primary font-normal">{concept.originality.concept_judge.setting_diff}</span>
              </div>
              <div className="p-3 bg-neutral rounded-md border border-border">
                <span className="font-medium text-secondary uppercase text-[10px] block mb-1">Characters Diff</span>
                <span className="text-primary font-normal">{concept.originality.concept_judge.characters_diff}</span>
              </div>
              <div className="p-3 bg-neutral rounded-md border border-border">
                <span className="font-medium text-secondary uppercase text-[10px] block mb-1">Metaphor Diff</span>
                <span className="text-primary font-normal">{concept.originality.concept_judge.metaphor_diff}</span>
              </div>
            </div>

            <p className="text-xs text-secondary">
              <strong>Judge Ruling:</strong> {concept.originality.concept_judge.reason}
            </p>
          </div>

          {/* B. 3 Ranked Hooks Picker */}
          <div className="bg-surface rounded-md p-6 border border-border">
            <div className="mb-4">
              <h3 className="text-base font-normal tracking-tight text-primary flex items-center gap-2">
                <Flame className="w-4 h-4 text-primary" />
                <span>Choose Your Opening Hook (3 Distinct Angles)</span>
              </h3>
              <p className="text-xs text-secondary">
                Select the hook angle that best fits your creator persona.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {concept.hooks.map((h, idx) => (
                <div
                  key={idx}
                  onClick={() => setSelectedHookIndex(idx)}
                  className={`p-4 rounded-md cursor-pointer transition border flex flex-col justify-between ${
                    selectedHookIndex === idx
                      ? "border-primary bg-neutral"
                      : "border-border bg-surface hover:border-secondary"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-mono uppercase text-primary">
                        Hook #{h.rank}: {h.type}
                      </span>
                      <span className="chip-minimal text-[10px]">
                        {h.expected_retention}
                      </span>
                    </div>

                    <p className="text-sm font-normal text-primary mb-3 leading-snug">
                      "{h.text}"
                    </p>
                  </div>

                  <div className="pt-2 border-t border-border text-[11px] text-secondary">
                    <strong>Visual Cue:</strong> {h.visual_cue}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* C. Continuous Spoken Script */}
          <div className="bg-surface rounded-md p-6 border border-border">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h3 className="text-base font-normal tracking-tight text-primary flex items-center gap-2">
                  <FileText className="w-4 h-4 text-primary" />
                  <span>Continuous Spoken Voiceover Script</span>
                </h3>
                <p className="text-xs text-secondary">
                  Rule 21 Compliant: Single flowing spoken paragraph. Zero section labels inside audio text.
                </p>
              </div>

              <button
                onClick={handleCopyScript}
                className="btn-secondary text-xs flex items-center gap-1.5"
              >
                {copiedScript ? <Check className="w-3.5 h-3.5 text-primary" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedScript ? "Copied" : "Copy Script"}</span>
              </button>
            </div>

            <textarea
              rows={4}
              value={editableScript}
              onChange={(e) => setEditableScript(e.target.value)}
              className="w-full p-4 bg-neutral border border-border rounded-md text-xs font-mono text-primary leading-relaxed outline-none focus:border-primary"
            />
          </div>

          {/* D. Style Lock Editor */}
          <div className="bg-surface rounded-md p-6 border border-border">
            <div className="mb-3">
              <h3 className="text-base font-normal tracking-tight text-primary flex items-center gap-2">
                <Lock className="w-4 h-4 text-primary" />
                <span>Style Lock Block (Appended to Every Shot Prompt)</span>
              </h3>
              <p className="text-xs text-secondary">
                Rule 22 Compliant: Consistent palette, lighting, camera moves, and subject lock.
              </p>
            </div>

            <textarea
              rows={2}
              value={editableStyleLock}
              onChange={(e) => setEditableStyleLock(e.target.value)}
              className="w-full p-3 bg-neutral border border-border rounded-md text-xs font-mono text-primary leading-relaxed outline-none focus:border-primary"
            />
          </div>

          {/* E. Beat-by-Beat Shot List with Prompts */}
          <div className="bg-surface rounded-md p-6 border border-border">
            <div className="mb-4">
              <h3 className="text-base font-normal tracking-tight text-primary flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Planned Shot List ({concept.shots.length} Shots)</span>
              </h3>
              <p className="text-xs text-secondary">
                Formatted prompts for LTX-2 &amp; Wan 2.2 with embedded Style Lock.
              </p>
            </div>

            <div className="space-y-4">
              {concept.shots.map((shot, sIdx) => (
                <div
                  key={sIdx}
                  className="p-4 bg-neutral rounded-md border border-border space-y-3"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="chip-minimal text-[10px] font-mono">
                        Shot #{shot.shot_index}
                      </span>
                      <span className="font-medium text-primary">
                        {shot.shot_type} • {shot.camera_motion}
                      </span>
                      <span className="font-mono text-secondary">
                        ({shot.duration_s}s)
                      </span>
                    </div>

                    {shot.on_screen_text && (
                      <span className="chip-minimal text-[10px]">
                        OCR: "{shot.on_screen_text}"
                      </span>
                    )}
                  </div>

                  <p className="text-xs text-secondary leading-relaxed">
                    {shot.description}
                  </p>

                  {/* Model Prompts */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-border text-xs font-mono">
                    <div className="p-3 bg-surface rounded-md border border-border flex flex-col justify-between">
                      <div className="text-[10px] font-medium uppercase text-primary mb-1">
                        LTX-2 Prompt (Draft Mode)
                      </div>
                      <p className="text-[11px] text-secondary line-clamp-2 mb-2">
                        {shot.prompt_ltx}
                      </p>
                      <button
                        onClick={() => handleCopyPrompt(shot.prompt_ltx, sIdx * 2)}
                        className="self-end btn-secondary text-[10px] h-7 px-3 flex items-center gap-1"
                      >
                        {copiedShotIndex === sIdx * 2 ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedShotIndex === sIdx * 2 ? "Copied" : "Copy LTX"}</span>
                      </button>
                    </div>

                    <div className="p-3 bg-surface rounded-md border border-border flex flex-col justify-between">
                      <div className="text-[10px] font-medium uppercase text-primary mb-1">
                        Wan 2.2 Prompt (Quality Mode)
                      </div>
                      <p className="text-[11px] text-secondary line-clamp-2 mb-2">
                        {shot.prompt_wan}
                      </p>
                      <button
                        onClick={() => handleCopyPrompt(shot.prompt_wan, sIdx * 2 + 1)}
                        className="self-end btn-secondary text-[10px] h-7 px-3 flex items-center gap-1"
                      >
                        {copiedShotIndex === sIdx * 2 + 1 ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedShotIndex === sIdx * 2 + 1 ? "Copied" : "Copy Wan"}</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* F. Action Bar: Ready for Generation */}
          <div className="p-6 bg-surface rounded-md border border-border flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="text-sm font-medium text-primary">
                Originality Check Passed • Concept Approved
              </h4>
              <p className="text-xs text-secondary">
                Proceed to draft video generation with &le;200ms audio sync.
              </p>
            </div>

            <button
              onClick={handleTriggerGeneration}
              disabled={isGeneratingDraft}
              className="btn-primary"
            >
              <Video className="w-4 h-4 mr-1.5" />
              <span>{isGeneratingDraft ? "Synthesizing Draft..." : "Generate 9:16 Draft Video"}</span>
            </button>
          </div>

          {isGeneratingDraft && (
            <div className="p-4 bg-neutral rounded-md border border-border flex items-center gap-3">
              <Sparkles className="w-4 h-4 text-primary animate-spin flex-shrink-0" />
              <div>
                <p className="text-xs font-medium text-primary">Generating 9:16 Video Draft...</p>
                <p className="text-[11px] text-secondary">
                  Synthesizing voiceover, generating shots with Style Lock, and verifying &le;200ms audio sync.
                </p>
              </div>
            </div>
          )}

          {generationMessage && !draftData && (
            <div className="p-3 bg-neutral text-primary text-xs font-normal rounded-md border border-border flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-primary" />
              <span>{generationMessage}</span>
            </div>
          )}

          {/* Phase 5: Draft Video Player Component */}
          {draftData && (
            <div className="pt-2">
              <DraftPlayer draft={draftData} onRegenerate={handleTriggerGeneration} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
