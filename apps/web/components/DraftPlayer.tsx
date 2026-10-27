"use client";

import React, { useState, useRef, useEffect } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Download,
  CheckCircle2,
  Sparkles,
  Layers,
  Clock,
  Film,
  Zap,
  RotateCcw,
  ShieldCheck,
  Maximize2,
  Radio,
} from "lucide-react";

export interface DraftShot {
  shot_index: number;
  t_start_s: number;
  duration_s: number;
  shot_type: string;
  camera_motion: string;
  description: string;
  on_screen_text?: string;
  prompt_ltx?: string;
  prompt_wan?: string;
}

export interface DraftData {
  concept_id: string;
  video_url: string;
  voiceover_url: string;
  duration_s: number;
  sync_delta_ms: number;
  in_sync: boolean;
  shots_count: number;
  shots: DraftShot[];
  product_or_topic: string;
  platform: string;
}

interface DraftPlayerProps {
  draft: DraftData;
  onRegenerate?: () => void;
}

export function DraftPlayer({ draft, onRegenerate }: DraftPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(draft.duration_s || 15);
  const [isMuted, setIsMuted] = useState(false);
  const [activeShotIndex, setActiveShotIndex] = useState(0);

  const fullVideoUrl = draft.video_url.startsWith("http")
    ? draft.video_url
    : `http://localhost:8000${draft.video_url}`;

  const fullExportUrl = `http://localhost:8000/v1/concepts/${draft.concept_id}/export`;
  const fullVoiceoverUrl = draft.voiceover_url.startsWith("http")
    ? draft.voiceover_url
    : `http://localhost:8000${draft.voiceover_url}`;

  // Track playback time and active shot
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const t = videoRef.current.currentTime;
    setCurrentTime(t);

    // Identify which shot is active based on t
    let cumulative = 0;
    for (let i = 0; i < draft.shots.length; i++) {
      const shot = draft.shots[i];
      const start = shot.t_start_s !== undefined ? shot.t_start_s : cumulative;
      const end = start + shot.duration_s;
      if (t >= start && t <= end) {
        setActiveShotIndex(i);
        break;
      }
      cumulative += shot.duration_s;
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current && videoRef.current.duration) {
      setDuration(videoRef.current.duration);
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    } else {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const seekToShot = (shot: DraftShot, index: number) => {
    if (!videoRef.current) return;
    const start = shot.t_start_s !== undefined ? shot.t_start_s : 0;
    videoRef.current.currentTime = start;
    setCurrentTime(start);
    setActiveShotIndex(index);
    if (!isPlaying) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleSliderSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const activeShot = draft.shots[activeShotIndex] || draft.shots[0];

  return (
    <div className="bg-white rounded-pin-lg border border-hairline shadow-sm overflow-hidden animate-fade-in">
      {/* 1. Header Bar */}
      <div className="p-6 border-b border-hairline flex flex-col md:flex-row md:items-center justify-between gap-4 bg-surface-card/60">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary mb-2">
            <Film className="w-3.5 h-3.5" />
            <span>Phase 5: 9:16 Draft Video Player</span>
          </div>
          <h3 className="text-xl font-extrabold text-ink tracking-tight">
            Assembled 9:16 Video &amp; Voiceover Preview
          </h3>
          <p className="text-xs text-mute font-mono">
            Concept: {draft.product_or_topic} • ID: {draft.concept_id.slice(0, 8)}...
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Audio Sync Badge */}
          <div
            className={`px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-1.5 ${
              draft.in_sync
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Sync: &plusmn;{draft.sync_delta_ms}ms ({draft.in_sync ? "Guaranteed &le;200ms" : "Review"})</span>
          </div>

          {/* Style Lock Badge */}
          <div className="pill-overlay text-xs font-bold flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
            <span>Style Lock Enforced</span>
          </div>

          {/* Export Action */}
          <a
            href={fullExportUrl}
            download={`framedna_${draft.concept_id}_draft.mp4`}
            className="btn-primary text-xs flex items-center gap-1.5 shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export MP4</span>
          </a>
        </div>
      </div>

      {/* 2. Main Studio Grid */}
      <div className="p-6 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Center: 9:16 Mobile Player Viewport */}
        <div className="lg:col-span-5 flex flex-col items-center">
          <div className="relative w-full max-w-[300px] aspect-[9/16] bg-black rounded-[32px] overflow-hidden shadow-2xl border-4 border-stone-800 flex flex-col justify-between group">
            {/* Top Phone Notch / Model Tag */}
            <div className="absolute top-3 inset-x-0 z-20 flex items-center justify-between px-4 pointer-events-none">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider bg-black/60 text-white backdrop-blur-md">
                {activeShotIndex === 0 ? "Wan 2.2 Hero" : "LTX-2 Draft"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono text-white/80 bg-black/60 backdrop-blur-md">
                720x1280
              </span>
            </div>

            {/* Video Element */}
            <video
              ref={videoRef}
              src={fullVideoUrl}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={handleLoadedMetadata}
              onEnded={() => setIsPlaying(false)}
              playsInline
              className="absolute inset-0 w-full h-full object-cover cursor-pointer"
              onClick={togglePlay}
            />

            {/* Dynamic OCR / On-Screen Text Overlay */}
            {activeShot?.on_screen_text && (
              <div className="absolute top-16 inset-x-4 z-10 pointer-events-none animate-fade-in">
                <div className="bg-primary/95 text-white text-xs font-black tracking-wide uppercase px-3 py-2 rounded-xl text-center shadow-lg border border-white/20">
                  {activeShot.on_screen_text}
                </div>
              </div>
            )}

            {/* Shot Description Floating Subtitle */}
            <div className="absolute bottom-16 inset-x-3 z-10 pointer-events-none">
              <div className="bg-black/75 backdrop-blur-md text-white text-[11px] p-2.5 rounded-xl border border-white/10 shadow-lg">
                <div className="text-[9px] font-bold uppercase text-primary mb-0.5">
                  Shot #{activeShot?.shot_index}: {activeShot?.shot_type}
                </div>
                <p className="line-clamp-2 leading-tight text-white/90">
                  {activeShot?.description}
                </p>
              </div>
            </div>

            {/* Interactive Player Controls Bar */}
            <div className="absolute bottom-0 inset-x-0 z-20 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-3 pt-6 flex flex-col gap-2">
              {/* Progress Bar */}
              <input
                type="range"
                min={0}
                max={duration || 15}
                step={0.1}
                value={currentTime}
                onChange={handleSliderSeek}
                className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer accent-primary"
              />

              <div className="flex items-center justify-between text-white text-xs">
                <div className="flex items-center gap-2">
                  <button
                    onClick={togglePlay}
                    className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                  </button>

                  <button
                    onClick={toggleMute}
                    className="p-1.5 rounded-full hover:bg-white/20 transition cursor-pointer"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </button>

                  <span className="font-mono text-[10px] text-white/80">
                    {currentTime.toFixed(1)}s / {duration.toFixed(1)}s
                  </span>
                </div>

                <button
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.currentTime = 0;
                      setCurrentTime(0);
                    }
                  }}
                  className="p-1 rounded-full hover:bg-white/20 transition cursor-pointer"
                  title="Restart"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          <p className="text-[11px] text-mute mt-3 font-medium text-center">
            Click video or spacebar to play/pause • Tap shots on the right to jump
          </p>
        </div>

        {/* Right: Shot Breakdown & Interactive Timeline */}
        <div className="lg:col-span-7 space-y-6">
          {/* Key Generation Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-surface-card rounded-xl border border-hairline">
              <span className="text-[10px] uppercase font-bold text-mute block mb-1">
                Total Duration
              </span>
              <span className="text-base font-extrabold text-ink font-mono">
                {draft.duration_s}s
              </span>
            </div>

            <div className="p-3 bg-surface-card rounded-xl border border-hairline">
              <span className="text-[10px] uppercase font-bold text-mute block mb-1">
                Shots Assembled
              </span>
              <span className="text-base font-extrabold text-ink font-mono">
                {draft.shots_count} Cuts
              </span>
            </div>

            <div className="p-3 bg-surface-card rounded-xl border border-hairline">
              <span className="text-[10px] uppercase font-bold text-mute block mb-1">
                Voiceover Sync
              </span>
              <span className="text-base font-extrabold text-emerald-600 font-mono">
                &plusmn;{draft.sync_delta_ms}ms
              </span>
            </div>

            <div className="p-3 bg-surface-card rounded-xl border border-hairline">
              <span className="text-[10px] uppercase font-bold text-mute block mb-1">
                Resolution
              </span>
              <span className="text-base font-extrabold text-ink font-mono">
                9:16 (720p)
              </span>
            </div>
          </div>

          {/* Interactive Shot Timeline Scrubber */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-bold text-ink flex items-center gap-2">
                <Layers className="w-4 h-4 text-primary" />
                <span>Interactive Shot Timeline</span>
              </h4>
              <span className="text-xs text-mute font-mono">
                Active: Shot #{activeShotIndex + 1}
              </span>
            </div>

            <div className="space-y-2.5 max-h-[420px] overflow-y-auto pr-1">
              {draft.shots.map((shot, idx) => {
                const isActive = activeShotIndex === idx;
                const modelName = idx === 0 ? "Wan 2.2 Quality" : "LTX-2 Draft";

                return (
                  <div
                    key={idx}
                    onClick={() => seekToShot(shot, idx)}
                    className={`p-3.5 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 ${
                      isActive
                        ? "bg-primary/5 border-primary shadow-sm"
                        : "bg-surface-card hover:bg-stone/20 border-hairline"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <span
                          className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[11px] ${
                            isActive
                              ? "bg-primary text-white"
                              : "bg-white text-ink border border-hairline"
                          }`}
                        >
                          {shot.shot_index}
                        </span>
                        <span className="font-bold text-ink">
                          {shot.shot_type}
                        </span>
                        <span className="text-mute font-medium">
                          • {shot.camera_motion}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-white border border-hairline text-ink">
                          {shot.duration_s}s
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ink text-white">
                          {modelName}
                        </span>
                      </div>
                    </div>

                    <p className="text-xs text-body leading-relaxed pl-8">
                      {shot.description}
                    </p>

                    {shot.on_screen_text && (
                      <div className="pl-8 flex items-center gap-1.5 text-[11px] font-semibold text-primary">
                        <Zap className="w-3 h-3" />
                        <span>OCR Overlay: "{shot.on_screen_text}"</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Download & Raw Assets Section */}
          <div className="p-4 bg-surface-card rounded-xl border border-hairline flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <a
                href={fullVoiceoverUrl}
                download="voiceover.wav"
                className="px-3 py-2 rounded-full text-xs font-bold bg-white hover:bg-secondary-bg text-ink border border-hairline flex items-center gap-1.5 cursor-pointer"
              >
                <Radio className="w-3.5 h-3.5 text-primary" />
                <span>Download Audio Track (16kHz WAV)</span>
              </a>
            </div>

            {onRegenerate && (
              <button
                onClick={onRegenerate}
                className="px-4 py-2 rounded-full text-xs font-bold text-mute hover:text-ink transition flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-assemble Draft</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
