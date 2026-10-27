"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Activity,
  Volume2,
  FileText,
  Eye,
  AlertCircle,
  Film,
  Zap,
  BarChart3,
  Flame,
  ArrowRight,
  GitCompare,
  Trophy,
  Wand2,
} from "lucide-react";
import { ReportViewer, AnalysisReport } from "../components/ReportViewer";
import { CompareViewer, CompareReport } from "../components/CompareViewer";
import { StatsDrawer } from "../components/StatsDrawer";
import { RemixStudio } from "../components/RemixStudio";
import { API_BASE_URL } from "../lib/api";

interface PipelineProgress {
  stage: string;
  progress_pct: number;
  message: string;
  error?: string | null;
}

interface FrameItem {
  t_ms: number;
  frame_path: string;
  thumb_path: string;
  is_keyframe: boolean;
}

interface TranscriptWord {
  w: string;
  start_ms: number;
  end_ms: number;
}

interface PipelineData {
  video_id: string;
  metadata: {
    width: number;
    height: number;
    fps: number;
    duration_s: number;
    duration_ms: number;
  };
  frames: FrameItem[];
  scenes: { scene_index: number; start_ms: number; end_ms: number; duration_ms: number }[];
  transcript?: {
    language: string;
    duration_s: number;
    text: string;
    words: TranscriptWord[];
  };
  audio_features?: {
    duration_s: number;
    mean_energy: number;
    silence_gaps: { start_ms: number; end_ms: number; duration_ms: number }[];
    energy_curve: { t_ms: number; rms: number }[];
  };
  ocr?: {
    keyframe_ms: number;
    texts: { text: string; confidence: number; bbox: number[][] }[];
  }[];
  analysis?: AnalysisReport;
  segments?: any[];
}

export default function Home() {
  const [appMode, setAppMode] = useState<"autopsy" | "compare" | "remix">("autopsy");
  const [sourceType, setSourceType] = useState<"upload" | "youtube">("upload");
  const [videoUrl, setVideoUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [rightsConfirmed, setRightsConfirmed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [videoId, setVideoId] = useState<string | null>(null);
  const [pipelineProgress, setPipelineProgress] = useState<PipelineProgress | null>(null);
  const [pipelineData, setPipelineData] = useState<PipelineData | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedFrame, setSelectedFrame] = useState<FrameItem | null>(null);
  const [selectedTimestamp, setSelectedTimestamp] = useState<number | null>(null);
  const [activeTab, setActiveTab] = useState<"autopsy" | "assets">("autopsy");

  // Phase 3 & 4 State: Stats Drawer, Compare Engine & Remix
  const [showStatsDrawer, setShowStatsDrawer] = useState(false);
  const [compareVideoIdA, setCompareVideoIdA] = useState("");
  const [compareVideoIdB, setCompareVideoIdB] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [compareReport, setCompareReport] = useState<CompareReport | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const inspectorRef = useRef<HTMLDivElement>(null);

  // SSE event stream listener for real-time progress
  useEffect(() => {
    if (!videoId) return;

    const eventSource = new EventSource(`${API_BASE_URL}/v1/videos/${videoId}/events`);

    eventSource.addEventListener("progress", (e) => {
      try {
        const data: PipelineProgress = JSON.parse(e.data);
        setPipelineProgress(data);

        if (data.stage === "ready") {
          eventSource.close();
          fetchPipelineData(videoId);
        } else if (data.stage === "failed") {
          eventSource.close();
          setErrorMessage(data.message || "Pipeline execution failed.");
        }
      } catch (err) {
        console.error("SSE parse error", err);
      }
    });

    eventSource.onerror = () => {
      setTimeout(() => {
        if (videoId) fetchPipelineData(videoId);
      }, 3000);
    };

    return () => {
      eventSource.close();
    };
  }, [videoId]);

  const fetchPipelineData = async (vid: string) => {
    try {
      const res = await fetch(`${API_BASE_URL}/v1/videos/${vid}/pipeline`);
      if (res.ok) {
        const data: PipelineData = await res.json();
        setPipelineData(data);
        if (data.frames && data.frames.length > 0) {
          setSelectedFrame(data.frames[0]);
        }
        if (data.analysis) {
          setActiveTab("autopsy");
        }
        // Pre-fill compare field
        if (!compareVideoIdA) setCompareVideoIdA(vid);
      }
    } catch (err) {
      console.error("Error loading pipeline data", err);
    }
  };

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

  const formatMs = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const m = Math.floor(totalSec / 60);
    const s = totalSec % 60;
    const mill = Math.floor((ms % 1000) / 100);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}.${mill}00`;
  };

  const handleSelectTimestamp = (t_ms: number) => {
    setSelectedTimestamp(t_ms);
    if (pipelineData?.frames && pipelineData.frames.length > 0) {
      const closest = pipelineData.frames.reduce((prev, curr) =>
        Math.abs(curr.t_ms - t_ms) < Math.abs(prev.t_ms - t_ms) ? curr : prev
      );
      setSelectedFrame(closest);
      inspectorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  const handleRunAnalysis = async () => {
    if (!pipelineData?.video_id) return;
    setIsAnalyzing(true);
    setErrorMessage(null);
    try {
      const res = await fetch(`${API_BASE_URL}/v1/videos/${pipelineData.video_id}/analyze`, {
        method: "POST",
      });
      if (!res.ok) {
        throw new Error("Failed to execute Phase 2 analysis engine.");
      }
      const report: AnalysisReport = await res.json();
      setPipelineData((prev) => (prev ? { ...prev, analysis: report } : null));
      setActiveTab("autopsy");
    } catch (err: any) {
      setErrorMessage(err.message || "Analysis request failed.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStatsUpdated = (newStats: any[]) => {
    setPipelineData((prev) => {
      if (!prev || !prev.analysis) return prev;
      return {
        ...prev,
        analysis: {
          ...prev.analysis,
          stats: newStats,
        },
      };
    });
  };

  const handleRunCompare = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!compareVideoIdA || !compareVideoIdB) {
      setErrorMessage("Please enter both Video A and Video B IDs to compare.");
      return;
    }

    setIsComparing(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/v1/compare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          video_a_id: compareVideoIdA.trim(),
          video_b_id: compareVideoIdB.trim(),
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Comparison failed. Verify both video IDs have been analyzed.");
      }

      const report: CompareReport = await res.json();
      setCompareReport(report);
    } catch (err: any) {
      setErrorMessage(err.message || "Could not complete comparison.");
    } finally {
      setIsComparing(false);
    }
  };

  const handleStartAnalysis = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setPipelineData(null);
    setPipelineProgress(null);

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

    try {
      if (sourceType === "upload" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("rights_confirmed", "true");

        const response = await fetch(`${API_BASE_URL}/v1/videos/upload`, {
          method: "POST",
          body: formData,
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ detail: "Upload failed" }));
          throw new Error(errData.detail || "Upload rejected by media server.");
        }

        const data = await response.json();
        setVideoId(data.id);
        setCompareVideoIdA(data.id);
      } else {
        const response = await fetch(`${API_BASE_URL}/v1/videos`, {
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
        setVideoId(data.id);
        setCompareVideoIdA(data.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Could not connect to API server. Ensure it is running.");
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
          <div
            onClick={() => setAppMode("autopsy")}
            className="flex items-center gap-2 cursor-pointer"
          >
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-black text-xl shadow-sm">
              F
            </div>
            <span className="font-bold text-xl tracking-tight text-ink">FrameDNA</span>
          </div>

          <div className="hidden md:flex items-center gap-2">
            <button
              onClick={() => setAppMode("autopsy")}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition ${
                appMode === "autopsy" ? "bg-ink text-white" : "text-ink hover:bg-secondary-bg"
              }`}
            >
              Autopsy
            </button>
            <button
              onClick={() => setAppMode("compare")}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition flex items-center gap-1.5 ${
                appMode === "compare" ? "bg-ink text-white" : "text-ink hover:bg-secondary-bg"
              }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              <span>Compare</span>
            </button>
            <button
              onClick={() => setAppMode("remix")}
              className={`px-4 py-2 rounded-full font-semibold text-sm transition flex items-center gap-1.5 ${
                appMode === "remix" ? "bg-ink text-white" : "text-ink hover:bg-secondary-bg"
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>Remix &amp; Draft (Phases 4-5)</span>
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
          <button
            onClick={() => {
              setAppMode("autopsy");
              window.scrollTo({ top: 300, behavior: "smooth" });
            }}
            className="btn-primary"
          >
            New Autopsy
          </button>
        </div>
      </header>

      {/* 2. Main Content Body */}
      <main className="flex-1 max-w-7xl mx-auto px-6 py-12 w-full">
        {/* MODE A: AUTOPSY ENGINE */}
        {appMode === "autopsy" && (
          <div>
            <div className="text-center max-w-3xl mx-auto mb-12">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-card border border-hairline text-xs font-semibold text-ink mb-6 shadow-xs">
                <Sparkles className="w-3.5 h-3.5 text-primary" />
                <span>Phase 4 Live — Originality Audit &amp; Structure Remix Studio</span>
              </div>

              <h1 className="text-4xl md:text-6xl font-extrabold text-ink tracking-display leading-[1.1] mb-6">
                Autopsy any viral video. <br />
                <span className="text-primary">Extract the structure</span> frame by frame.
              </h1>

              <p className="text-lg text-mute font-normal leading-relaxed">
                Proof, a diff, and a rebuild. Frame-by-frame breakdown explaining <em>why</em> it works
                with timestamped evidence, verified source metrics, and side-by-side comparison.
              </p>
            </div>

            {/* Ingest Card */}
            <div className="max-w-2xl mx-auto bg-surface-card rounded-pin-lg p-8 border border-hairline/80 shadow-sm mb-12">
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
                          Drag &amp; drop your video file here, or <span className="text-primary underline">browse</span>
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
                  <span>{isSubmitting ? "Uploading Video..." : "Run Autopsy Pipeline & Frame Extraction"}</span>
                </button>

                {/* Live Pipeline Progress (SSE) */}
                {pipelineProgress && (
                  <div className="p-4 bg-white rounded-pin border border-hairline space-y-3">
                    <div className="flex items-center justify-between text-xs font-bold text-ink">
                      <span className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-primary animate-spin" />
                        <span>Stage: <span className="uppercase text-primary font-mono">{pipelineProgress.stage}</span></span>
                      </span>
                      <span>{pipelineProgress.progress_pct}%</span>
                    </div>
                    <div className="w-full h-2 bg-secondary-bg rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all duration-300"
                        style={{ width: `${pipelineProgress.progress_pct}%` }}
                      />
                    </div>
                    <p className="text-xs text-mute font-medium">
                      {pipelineProgress.message}
                    </p>
                  </div>
                )}

                {errorMessage && (
                  <div className="p-3 bg-semantic-error/10 border border-semantic-error/20 rounded-pin text-xs text-semantic-error font-medium flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </form>
            </div>

            {/* Active Video Results Section */}
            {pipelineData && (
              <div className="space-y-8">
                {/* View Switcher Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-surface-card p-3 rounded-pin border border-hairline gap-3">
                  <div className="flex bg-white p-1 rounded-full border border-hairline">
                    <button
                      onClick={() => setActiveTab("autopsy")}
                      className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${
                        activeTab === "autopsy"
                          ? "bg-primary text-white shadow-xs"
                          : "text-ink hover:bg-secondary-bg"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Executive Autopsy</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("assets")}
                      className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${
                        activeTab === "assets"
                          ? "bg-ink text-white shadow-xs"
                          : "text-ink hover:bg-secondary-bg"
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Raw Assets</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowStatsDrawer(true)}
                      className="px-3.5 py-2 rounded-full text-xs font-bold bg-white hover:bg-secondary-bg border border-hairline text-ink flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-primary" />
                      <span>Stats ({pipelineData.analysis?.stats?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => {
                        setCompareVideoIdA(pipelineData.video_id);
                        setAppMode("compare");
                      }}
                      className="px-3.5 py-2 rounded-full text-xs font-bold bg-white hover:bg-secondary-bg border border-hairline text-ink flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <GitCompare className="w-3.5 h-3.5" />
                      <span>Compare</span>
                    </button>

                    <button
                      onClick={() => setAppMode("remix")}
                      className="btn-primary text-xs flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Remix Concept</span>
                    </button>
                  </div>
                </div>

                {/* Frame Focus Inspector Card */}
                <div
                  ref={inspectorRef}
                  className="bg-white rounded-pin-lg p-6 border border-hairline shadow-sm flex flex-col md:flex-row items-center gap-6"
                >
                  <div className="relative w-48 aspect-[9/16] bg-surface-dark rounded-pin overflow-hidden flex-shrink-0 shadow-sm">
                    {selectedFrame ? (
                      <img
                        src={`${API_BASE_URL}/storage/thumbs/${pipelineData.video_id}/${selectedFrame.t_ms}.jpg`}
                        alt={`Frame at ${selectedFrame.t_ms}ms`}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/50 text-xs">
                        No Frame
                      </div>
                    )}
                    <div className="absolute top-2 left-2 pill-overlay text-[10px] py-0.5 px-2">
                      {selectedFrame ? formatMs(selectedFrame.t_ms) : "00:00.000"}
                    </div>
                    {selectedFrame?.is_keyframe && (
                      <div className="absolute bottom-2 right-2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                        Keyframe
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-primary text-white">
                        Grounded Visual Evidence
                      </span>
                      <span className="text-xs font-mono text-mute">
                        Frame Timestamp: {selectedFrame ? `${selectedFrame.t_ms} ms (${formatMs(selectedFrame.t_ms)})` : "0 ms"}
                      </span>
                    </div>

                    <h4 className="text-lg font-bold text-ink">
                      Synchronized Frame &amp; Audio Snapshot
                    </h4>

                    <p className="text-xs text-mute leading-relaxed">
                      Every score and structural critique in FrameDNA is anchored to concrete visual or acoustic evidence at this millisecond mark.
                    </p>

                    <div className="pt-2 flex flex-wrap gap-2 text-xs">
                      <div className="p-2.5 bg-surface-card rounded-pin border border-hairline">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-mute block mb-0.5">
                          Spoken Audio Around Timestamp
                        </span>
                        <span className="font-medium text-ink">
                          {pipelineData.transcript?.words && selectedFrame
                            ? pipelineData.transcript.words
                                .filter(
                                  (w) =>
                                    Math.abs(w.start_ms - selectedFrame.t_ms) <= 2500 ||
                                    (w.start_ms <= selectedFrame.t_ms && w.end_ms >= selectedFrame.t_ms)
                                )
                                .map((w) => w.w)
                                .join(" ") || "No dialogue active at this moment."
                            : "No audio transcript available."}
                        </span>
                      </div>

                      {pipelineData.ocr && selectedFrame && (
                        <div className="p-2.5 bg-surface-card rounded-pin border border-hairline">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-mute block mb-0.5">
                            On-Screen Keyframe OCR Text
                          </span>
                          <span className="font-medium text-ink">
                            {pipelineData.ocr
                              .filter((item) => Math.abs(item.keyframe_ms - selectedFrame.t_ms) <= 1500)
                              .flatMap((item) => item.texts.map((t) => t.text))
                              .join(" • ") || "No OCR overlay text detected."}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* TAB 1: EXECUTIVE AUTOPSY */}
                {activeTab === "autopsy" && (
                  <div>
                    {pipelineData.analysis ? (
                      <ReportViewer
                        videoId={pipelineData.video_id}
                        report={pipelineData.analysis}
                        durationMs={pipelineData.metadata.duration_ms}
                        onSelectTimestamp={handleSelectTimestamp}
                        selectedTimestamp={selectedTimestamp}
                        onOpenStatsDrawer={() => setShowStatsDrawer(true)}
                      />
                    ) : (
                      <div className="p-12 bg-white rounded-pin-lg border border-hairline text-center space-y-4">
                        <div className="w-14 h-14 rounded-full bg-surface-card flex items-center justify-center text-primary mx-auto shadow-xs">
                          <Sparkles className="w-7 h-7" />
                        </div>
                        <h3 className="text-xl font-bold text-ink">
                          Autopsy Analysis Engine Ready
                        </h3>
                        <p className="text-sm text-mute max-w-md mx-auto">
                          All media frames, transcript words, and acoustic curves are extracted. Click below to synthesize the 7-score matrix, timestamped evidence, and structural blueprint.
                        </p>
                        <button
                          onClick={handleRunAnalysis}
                          disabled={isAnalyzing}
                          className="btn-primary"
                        >
                          {isAnalyzing ? "Running Analysis..." : "Generate Autopsy Report Now"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: RAW ASSETS INSPECTOR */}
                {activeTab === "assets" && (
                  <section className="bg-white rounded-pin-lg p-8 border border-hairline mb-12 shadow-sm animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-hairline gap-4 mb-8">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-semantic-successPale text-semantic-successDeep mb-2">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Pipeline Completed (100%)</span>
                        </div>
                        <h2 className="text-2xl font-bold text-ink">
                          Extracted Media Assets &amp; Timestamps
                        </h2>
                        <p className="text-xs text-mute">
                          ID: <span className="font-mono text-ink font-semibold">{pipelineData.video_id}</span> • {pipelineData.metadata.duration_s}s duration • {pipelineData.metadata.width}x{pipelineData.metadata.height} @ {pipelineData.metadata.fps}fps
                        </p>
                      </div>
                    </div>

                    <div className="mb-8">
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-bold text-ink flex items-center gap-2">
                          <Film className="w-4 h-4 text-primary" />
                          <span>1 FPS Extracted Frames ({pipelineData.frames.length} total)</span>
                        </h3>
                        <span className="text-xs text-mute">Click any frame to inspect timestamp</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 overflow-x-auto pb-2">
                        {pipelineData.frames.map((frame, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSelectTimestamp(frame.t_ms)}
                            className={`card-pin p-1 cursor-pointer transition border-2 ${
                              selectedFrame?.t_ms === frame.t_ms
                                ? "border-primary shadow-sm"
                                : "border-transparent hover:border-stone"
                            }`}
                          >
                            <div className="relative aspect-[9/16] bg-surface-dark rounded-xl overflow-hidden flex items-center justify-center">
                              <img
                                src={`${API_BASE_URL}/storage/thumbs/${pipelineData.video_id}/${frame.t_ms}.jpg`}
                                alt={`Frame at ${frame.t_ms}ms`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                              <div className="absolute top-2 left-2 pill-overlay text-[10px] py-0.5 px-2">
                                {formatMs(frame.t_ms)}
                              </div>
                              {frame.is_keyframe && (
                                <div className="absolute bottom-2 right-2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                                  Cut
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        )}

        {/* MODE B: COMPARE STUDIO (Phase 3) */}
        {appMode === "compare" && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center max-w-3xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-surface-card border border-hairline text-xs font-semibold text-ink mb-4 shadow-xs">
                <GitCompare className="w-3.5 h-3.5 text-primary" />
                <span>Phase 3 Feature: Side-by-Side Blueprint Diff Engine</span>
              </div>
              <h2 className="text-3xl md:text-5xl font-extrabold text-ink tracking-tight mb-4">
                Compare Winner vs Flop
              </h2>
              <p className="text-sm md:text-base text-mute">
                Align narrative beats, score deltas, and pacing velocity. Every claim cites exact timestamps from both clips.
              </p>
            </div>

            <div className="max-w-3xl mx-auto bg-surface-card rounded-pin-lg p-8 border border-hairline shadow-sm">
              <form onSubmit={handleRunCompare} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                      Video A ID (Baseline or Winner)
                    </label>
                    <input
                      type="text"
                      value={compareVideoIdA}
                      onChange={(e) => setCompareVideoIdA(e.target.value)}
                      placeholder="e.g. 7481ba93-..."
                      className="w-full bg-white border border-stone rounded-xl py-3 px-4 text-xs font-mono text-ink outline-none focus:border-primary transition"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-ink mb-2">
                      Video B ID (Comparison Concept)
                    </label>
                    <input
                      type="text"
                      value={compareVideoIdB}
                      onChange={(e) => setCompareVideoIdB(e.target.value)}
                      placeholder="e.g. 81a942df-..."
                      className="w-full bg-white border border-stone rounded-xl py-3 px-4 text-xs font-mono text-ink outline-none focus:border-primary transition"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2">
                  <span className="text-xs text-mute">
                    Both videos must be ingested and analyzed before running blueprint diff.
                  </span>

                  <button
                    type="submit"
                    disabled={isComparing || !compareVideoIdA || !compareVideoIdB}
                    className="btn-primary flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <GitCompare className="w-4 h-4" />
                    <span>{isComparing ? "Aligning Blueprints..." : "Run Diff Comparison"}</span>
                  </button>
                </div>
              </form>
            </div>

            {compareReport && (
              <CompareViewer report={compareReport} />
            )}
          </div>
        )}

        {/* MODE C: REMIX CONCEPT STUDIO (Phase 4) */}
        {appMode === "remix" && (
          <RemixStudio
            sourceVideoId={pipelineData?.video_id || compareVideoIdA || "g1_product_ad"}
          />
        )}
      </main>

      {/* Global Stats Drawer Modal */}
      {pipelineData && (
        <StatsDrawer
          isOpen={showStatsDrawer}
          onClose={() => setShowStatsDrawer(false)}
          videoId={pipelineData.video_id}
          stats={pipelineData.analysis?.stats || []}
          onStatsUpdated={handleStatsUpdated}
        />
      )}

      {/* Clean Footer */}
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
