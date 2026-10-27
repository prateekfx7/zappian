"use client";

import React, { useState, useRef } from "react";
import {
  Upload,
  Link as LinkIcon,
  CheckCircle2,
  Sparkles,
  FileVideo,
  X,
  Play,
  Layers,
  ChevronRight,
  TrendingUp,
  Clock,
  Search,
} from "lucide-react";

export default function Home() {
  const [sourceType, setSourceType] = useState<"upload" | "youtube">("upload");
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [uploadResult, setUploadResult] = useState<any | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
      setErrorMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/") || file.name.match(/\.(mp4|mov|webm|mkv)$/i)) {
        setSelectedFile(file);
        setErrorMessage(null);
      } else {
        setErrorMessage("Please drop a valid video file (MP4, MOV, WebM).");
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setUploadResult(null);

    if (!rightsConfirmed) {
      setErrorMessage("Please confirm rights ownership before proceeding.");
      return;
    }

    if (sourceType === "upload" && !selectedFile) {
      setErrorMessage("Please choose or drop a video file to upload.");
      return;
    }

    if (sourceType === "youtube" && !videoUrl.trim()) {
      setErrorMessage("Please paste a valid YouTube video URL.");
      return;
    }

    setIsSubmitting(true);
    setUploadProgress("Transferring video payload to media pipeline...");

    try {
      if (sourceType === "upload" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("rights_confirmed", "true");

        const response = await fetch("http://localhost:8000/v1/videos/upload", {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ detail: "Upload failed" }));
          throw new Error(errData.detail || "Upload rejected by media server.");
        }

        const data = await response.json();
        setUploadResult(data);
        setUploadProgress(null);
      } else {
        const response = await fetch("http://localhost:8000/v1/videos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_type: "youtube",
            source_url: videoUrl,
            rights_confirmed: true,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ detail: "Failed to queue URL" }));
          throw new Error(errData.detail || "Server rejected YouTube ingest request.");
        }

        const data = await response.json();
        setUploadResult(data);
        setUploadProgress(null);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Could not connect to API server. Ensure it is running.");
      setUploadProgress(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid =
    rightsConfirmed &&
    ((sourceType === "upload" && selectedFile !== null) ||
      (sourceType === "youtube" && videoUrl.trim().length > 0));

  return (
    <div className="min-h-screen flex flex-col bg-surface-canvas selection:bg-primary/20">
      {/* 1. Pinterest-inspired Sticky Navigation */}
      <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-hairline h-16 px-6 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2 cursor-pointer">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-black text-xl shadow-sm">
              F
            </div>
            <span className="font-bold text-xl tracking-tight text-ink">FrameDNA</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button className="px-4 py-2 rounded-full font-semibold text-sm bg-ink text-white">
              Explore
            </button>
            <button className="px-4 py-2 rounded-full font-semibold text-sm text-ink hover:bg-secondary-bg transition">
              Blueprints
            </button>
            <button className="px-4 py-2 rounded-full font-semibold text-sm text-ink hover:bg-secondary-bg transition">
              Diffs
            </button>
          </div>
        </div>

        {/* Center Search Pill */}
        <div className="hidden lg:flex items-center flex-1 max-w-md mx-8 relative">
          <Search className="w-4 h-4 text-mute absolute left-4" />
          <input
            type="text"
            placeholder="Search viral blueprints, hooks, and niches..."
            className="w-full bg-surface-card hover:bg-surface-card/80 focus:bg-white border border-transparent focus:border-stone rounded-full py-2.5 pl-11 pr-4 text-sm text-ink outline-none transition"
          />
        </div>

        {/* Right Nav */}
        <div className="flex items-center gap-3">
          <button className="text-sm font-semibold text-ink px-4 py-2 rounded-pin hover:bg-secondary-bg transition">
            Docs
          </button>
          <button className="btn-primary">
            Start Analysis
          </button>
        </div>
      </header>

      {/* 2. Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        <div className="text-center max-w-3xl mx-auto mb-12">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-card border border-hairline-soft text-xs font-semibold text-ink mb-6">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span>Proof, a diff, and a rebuild — not just a score</span>
          </div>

          <h1 className="text-4xl md:text-6xl font-extrabold text-ink tracking-display leading-[1.1] mb-6">
            Autopsy any viral video. <br />
            <span className="text-primary">Remix the DNA</span> legally.
          </h1>

          <p className="text-lg text-mute font-normal leading-relaxed">
            Frame-by-frame breakdown of why videos hold attention, sell, and grow. Every claim
            is backed by timestamped evidence. Extract the blueprint and generate original variants.
          </p>
        </div>

        {/* 3. Ingest Card (Photo/Magazine styled) */}
        <div className="max-w-2xl mx-auto bg-surface-card rounded-pin-lg p-8 border border-hairline/80 shadow-sm mb-16">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-ink">Submit Video for Autopsy</h2>
            <div className="flex bg-secondary-bg p-1 rounded-full">
              <button
                type="button"
                onClick={() => {
                  setSourceType("upload");
                  setErrorMessage(null);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  sourceType === "upload" ? "bg-white text-ink shadow-xs" : "text-mute"
                }`}
              >
                Upload File
              </button>
              <button
                type="button"
                onClick={() => {
                  setSourceType("youtube");
                  setErrorMessage(null);
                }}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition ${
                  sourceType === "youtube" ? "bg-white text-ink shadow-xs" : "text-mute"
                }`}
              >
                YouTube Link
              </button>
            </div>
          </div>

          <form onSubmit={handleStartAnalysis} className="space-y-6">
            {sourceType === "upload" ? (
              <div>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="video/mp4,video/quicktime,video/webm,video/x-matroska"
                  className="hidden"
                />

                {!selectedFile ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-pin p-8 text-center transition cursor-pointer flex flex-col items-center justify-center ${
                      isDragging
                        ? "border-primary bg-primary/5"
                        : "border-stone bg-white/60 hover:bg-white"
                    }`}
                  >
                    <div className="w-12 h-12 rounded-full bg-surface-card flex items-center justify-center text-primary mb-3 shadow-xs">
                      <Upload className="w-6 h-6" />
                    </div>
                    <div className="text-sm font-semibold text-ink mb-1">
                      Drag & drop your video file here, or <span className="text-primary underline">browse</span>
                    </div>
                    <p className="text-xs text-mute">
                      Supports MP4, MOV, WebM up to 500 MB (up to 3 minutes)
                    </p>
                  </div>
                ) : (
                  <div className="p-4 bg-white rounded-pin border border-hairline flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary-bg flex items-center justify-center text-primary">
                        <FileVideo className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-ink max-w-xs truncate">
                          {selectedFile.name}
                        </div>
                        <div className="text-xs text-mute">
                          {formatFileSize(selectedFile.size)}
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setSelectedFile(null)}
                      className="p-1.5 rounded-full hover:bg-secondary-bg text-mute hover:text-ink transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-bold text-mute uppercase tracking-wider mb-2">
                  Paste Video URL
                </label>
                <div className="relative">
                  <LinkIcon className="w-4 h-4 text-mute absolute left-4 top-3.5" />
                  <input
                    type="url"
                    value={videoUrl}
                    onChange={(e) => setVideoUrl(e.target.value)}
                    placeholder="https://www.youtube.com/watch?v=..."
                    className="w-full bg-white border border-stone rounded-pin py-3 pl-11 pr-4 text-sm text-ink outline-none focus:border-primary transition"
                  />
                </div>
              </div>
            )}

            {/* Mandatory Rights Checkbox (Rule 5 & FR-4) */}
            <div className="flex items-start gap-3 p-4 bg-white rounded-pin border border-hairline">
              <input
                type="checkbox"
                id="rights"
                checked={rightsConfirmed}
                onChange={(e) => setRightsConfirmed(e.target.checked)}
                className="mt-1 h-4 w-4 rounded text-primary focus:ring-primary border-stone cursor-pointer"
              />
              <label htmlFor="rights" className="text-xs text-body leading-relaxed cursor-pointer select-none">
                <strong className="text-ink font-semibold">Rights confirmation:</strong> I certify that I own this video or have authorized permission to analyse its structural elements.
              </label>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !isFormValid}
              className={`w-full h-12 rounded-pin font-bold text-sm flex items-center justify-center gap-2 transition ${
                isFormValid && !isSubmitting
                  ? "bg-primary hover:bg-primary-pressed text-white cursor-pointer shadow-sm"
                  : "bg-stone/50 text-ash cursor-not-allowed border border-hairline"
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>{isSubmitting ? "Processing Upload..." : "Generate Evidence-Backed Autopsy"}</span>
            </button>

            {uploadProgress && (
              <div className="p-3 bg-secondary-bg/60 rounded-pin text-xs text-ink font-medium text-center animate-pulse">
                {uploadProgress}
              </div>
            )}

            {uploadResult && (
              <div className="p-4 bg-semantic-successPale/50 border border-semantic-successPale rounded-pin">
                <div className="flex items-center gap-2 text-semantic-successDeep font-bold text-sm mb-1">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Video Successfully Stored & Ingested!</span>
                </div>
                <div className="text-xs text-charcoal space-y-1 font-mono">
                  <div><strong>Video ID:</strong> {uploadResult.id}</div>
                  <div><strong>Status:</strong> {uploadResult.status} (Stage: {uploadResult.stage})</div>
                  {uploadResult.storage_key && (
                    <div className="truncate"><strong>Storage:</strong> {uploadResult.storage_key}</div>
                  )}
                  {uploadResult.size_bytes && (
                    <div><strong>Size:</strong> {formatFileSize(uploadResult.size_bytes)}</div>
                  )}
                </div>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 bg-semantic-error/10 border border-semantic-error/20 rounded-pin text-xs text-semantic-error font-medium">
                {errorMessage}
              </div>
            )}
          </form>
        </div>

        {/* 4. Pinterest-style Masonry Showcase Preview */}
        <section className="mt-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-ink">
                Evidence In Action
              </h2>
              <p className="text-sm text-mute">
                Every claim linked to a timestamp and keyframe. Reusable blueprints, zero guesswork.
              </p>
            </div>
            <div className="flex gap-2">
              <span className="pill-overlay">7 Golden Samples</span>
              <span className="pill-overlay">100% Evidence Rule</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Card 1 */}
            <div className="card-pin p-5 flex flex-col justify-between">
              <div>
                <div className="relative aspect-[9/12] bg-surface-dark rounded-pin overflow-hidden mb-4 flex items-center justify-center">
                  <div className="absolute top-3 left-3 pill-overlay flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-primary" />
                    <span>00:01.200</span>
                  </div>
                  <div className="text-center p-6 text-white/90">
                    <Play className="w-10 h-10 mx-auto mb-2 text-primary" />
                    <span className="text-xs uppercase tracking-wider font-bold">Product Hook Beat</span>
                  </div>
                </div>
                <div className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-semantic-successPale text-semantic-successDeep mb-2">
                  Retention +28% vs Niche
                </div>
                <h3 className="text-base font-bold text-ink mb-1">
                  Fast Problem Cut + Visual Shock
                </h3>
                <p className="text-xs text-mute leading-relaxed">
                  Subject introduces tension before dialogue starts, cutting at 1.2s to establish urgency.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between text-xs font-semibold text-ink">
                <span>Hook Score: 92/100</span>
                <span className="text-primary flex items-center gap-1">Blueprint <ChevronRight className="w-3 h-3" /></span>
              </div>
            </div>

            {/* Card 2 */}
            <div className="card-pin p-5 flex flex-col justify-between">
              <div>
                <div className="relative aspect-[9/12] bg-stone/40 rounded-pin overflow-hidden mb-4 flex items-center justify-center">
                  <div className="absolute top-3 left-3 pill-overlay flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-primary" />
                    <span>00:14.500</span>
                  </div>
                  <div className="text-center p-6 text-charcoal">
                    <Layers className="w-10 h-10 mx-auto mb-2 text-mute" />
                    <span className="text-xs uppercase tracking-wider font-bold">Mechanism Demo</span>
                  </div>
                </div>
                <div className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary mb-2">
                  Originality Check: 98% Pass
                </div>
                <h3 className="text-base font-bold text-ink mb-1">
                  Split-Screen Texture Comparison
                </h3>
                <p className="text-xs text-mute leading-relaxed">
                  Macro close-up with pacing synced to bass drop, validating product claim without speaking.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between text-xs font-semibold text-ink">
                <span>Clarity Score: 95/100</span>
                <span className="text-primary flex items-center gap-1">Remix <ChevronRight className="w-3 h-3" /></span>
              </div>
            </div>

            {/* Card 3 */}
            <div className="card-pin p-5 flex flex-col justify-between">
              <div>
                <div className="relative aspect-[9/12] bg-surface-dark rounded-pin overflow-hidden mb-4 flex items-center justify-center">
                  <div className="absolute top-3 left-3 pill-overlay flex items-center gap-1.5">
                    <Clock className="w-3 h-3 text-primary" />
                    <span>00:28.000</span>
                  </div>
                  <div className="text-center p-6 text-white/90">
                    <TrendingUp className="w-10 h-10 mx-auto mb-2 text-semantic-successPale" />
                    <span className="text-xs uppercase tracking-wider font-bold">CTA Framing</span>
                  </div>
                </div>
                <div className="inline-block px-2.5 py-1 rounded-full text-xs font-bold bg-secondary-bg text-ink mb-2">
                  Sales Potential: High (Estimate)
                </div>
                <h3 className="text-base font-bold text-ink mb-1">
                  Single Flowing Voiceover Script
                </h3>
                <p className="text-xs text-mute leading-relaxed">
                  Direct call-to-action without abrupt transition labels; single continuous audio paragraph.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-hairline flex items-center justify-between text-xs font-semibold text-ink">
                <span>CTA Score: 89/100</span>
                <span className="text-primary flex items-center gap-1">Audited <ChevronRight className="w-3 h-3" /></span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* 5. Clean Footer */}
      <footer className="border-t border-hairline py-8 px-6 bg-white mt-16 text-center text-xs text-mute">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center text-white text-[10px] font-black">
              F
            </div>
            <span className="font-bold text-ink">FrameDNA</span>
            <span>&copy; 2026. Open-Source-First Video Autopsy &amp; Structure Remix Engine.</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-ink cursor-pointer">Rules</span>
            <span className="hover:text-ink cursor-pointer">Privacy &amp; Retention</span>
            <span className="hover:text-ink cursor-pointer">Originality Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
