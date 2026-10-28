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
  MoreHorizontal,
  Brain,
} from "lucide-react";
import { ReportViewer, AnalysisReport } from "../components/ReportViewer";
import { CompareViewer, CompareReport } from "../components/CompareViewer";
import { StatsDrawer } from "../components/StatsDrawer";
import { RemixStudio } from "../components/RemixStudio";
import { BrainViewer } from "../components/BrainViewer";
import { AutopsyScanner } from "../components/AutopsyScanner";
import { IngestProgressCard } from "../components/IngestProgressCard";
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
  const [appMode, setAppMode] = useState<"autopsy" | "brain" | "compare" | "remix">("autopsy");
  const [remixPrefill, setRemixPrefill] = useState<{
    topic?: string;
    platform?: "tiktok" | "reels" | "youtube_shorts";
    durationS?: number;
  }>({});
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

  // Stats Drawer, Compare Engine & Remix
  const [showStatsDrawer, setShowStatsDrawer] = useState(false);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
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
          setPipelineProgress(null);
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
        throw new Error("Failed to execute analysis engine.");
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
      setErrorMessage("Please confirm permission before proceeding.");
      return;
    }

    if (sourceType === "upload" && !selectedFile) {
      setErrorMessage("Please choose or drop a video file to upload.");
      return;
    }

    if (sourceType === "youtube" && !videoUrl.trim()) {
      setErrorMessage("Please paste a valid video URL.");
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
            source_url: videoUrl.trim(),
            rights_confirmed: true,
          }),
        });

        if (!response.ok) {
          const errData = await response.json().catch(() => ({ detail: "Failed to queue URL" }));
          throw new Error(errData.detail || "Server rejected video URL request.");
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
    <div className="min-h-screen flex flex-col bg-neutral text-primary">
      {/* 1. Header — Vercel Minimal Navigation */}
      <header className="sticky top-0 z-50 bg-surface border-b border-border h-14 px-6 flex items-center justify-between">
        <div
          onClick={() => {
            setAppMode("autopsy");
            setPipelineData(null);
            setVideoId(null);
            setPipelineProgress(null);
          }}
          className="flex items-center gap-2.5 cursor-pointer"
        >
          <div className="w-6 h-6 rounded-sm bg-primary flex items-center justify-center text-tertiary font-medium text-xs">
            ▲
          </div>
          <span className="font-medium text-sm tracking-tight text-primary">ReelBrain</span>
        </div>

        {/* Center: Monochrome 4-Mode Segmented Pill */}
        <div className="flex items-center bg-neutral p-0.5 rounded-full border border-border">
          <button
            onClick={() => setAppMode("autopsy")}
            className={`px-3.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              appMode === "autopsy"
                ? "bg-surface text-primary border border-border shadow-none"
                : "text-secondary hover:text-primary"
            }`}
          >
            Autopsy
          </button>
          <button
            onClick={() => setAppMode("brain")}
            className={`px-3.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              appMode === "brain"
                ? "bg-surface text-primary border border-border shadow-none"
                : "text-secondary hover:text-primary"
            }`}
          >
            Brain
          </button>
          <button
            onClick={() => setAppMode("compare")}
            className={`px-3.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              appMode === "compare"
                ? "bg-surface text-primary border border-border shadow-none"
                : "text-secondary hover:text-primary"
            }`}
          >
            Compare
          </button>
          <button
            onClick={() => setAppMode("remix")}
            className={`px-3.5 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              appMode === "remix"
                ? "bg-surface text-primary border border-border shadow-none"
                : "text-secondary hover:text-primary"
            }`}
          >
            Remix
          </button>
        </div>

        {/* Right: Minimal Overflow Menu */}
        <div className="relative">
          <button
            onClick={() => setShowOverflowMenu(!showOverflowMenu)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-secondary hover:text-primary hover:bg-neutral transition cursor-pointer"
            aria-label="More options"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showOverflowMenu && (
            <div className="absolute right-0 mt-2 w-52 bg-surface rounded-md border border-border p-1.5 z-50 text-xs space-y-0.5">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between text-secondary">
                <span>Backend API</span>
                <span className="font-mono text-[11px] text-primary">Port 8001</span>
              </div>
              <button
                onClick={() => {
                  setShowOverflowMenu(false);
                  fetchPipelineData("g1_product_ad");
                  setAppMode("autopsy");
                }}
                className="w-full text-left px-3 py-2 rounded-sm hover:bg-neutral text-primary font-normal transition cursor-pointer"
              >
                Load Sample Autopsy
              </button>
              {pipelineData && (
                <button
                  onClick={() => {
                    setShowOverflowMenu(false);
                    setPipelineData(null);
                    setVideoId(null);
                    setPipelineProgress(null);
                  }}
                  className="w-full text-left px-3 py-2 rounded-sm hover:bg-neutral text-primary font-normal transition cursor-pointer"
                >
                  Analyze New Video
                </button>
              )}
            </div>
          )}
        </div>
      </header>

      {/* 2. Main Body with Expansive Whitespace */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-12 md:py-16 w-full">
        {/* MODE A: AUTOPSY ENGINE */}
        {appMode === "autopsy" && (
          <div>
            {/* Centered Spotlight Dropzone */}
            {!pipelineData && (
              <div className="max-w-xl mx-auto py-12 md:py-20 text-center animate-fade-in">
                <h1 className="text-4xl md:text-5xl font-normal tracking-[-3.36px] text-primary mb-3">
                  Drop a video to analyze
                </h1>
                <p className="text-base text-secondary mb-10 font-normal">
                  Pacing, hook psychology, and original remix
                </p>

                <div className="bg-surface rounded-md p-8 md:p-10 border border-border text-left">
                  {/* Segmented Source Selector */}
                  <div className="flex bg-neutral p-0.5 rounded-full w-fit mx-auto mb-6 border border-border">
                    <button
                      type="button"
                      onClick={() => {
                        setSourceType("upload");
                        setErrorMessage(null);
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                        sourceType === "upload"
                          ? "bg-surface text-primary border border-border"
                          : "text-secondary hover:text-primary"
                      }`}
                    >
                      File Upload
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSourceType("youtube");
                        setErrorMessage(null);
                      }}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition cursor-pointer ${
                        sourceType === "youtube"
                          ? "bg-surface text-primary border border-border"
                          : "text-secondary hover:text-primary"
                      }`}
                    >
                      Video Link
                    </button>
                  </div>

                  <form onSubmit={handleStartAnalysis} className="space-y-5">
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
                            className={`border border-dashed rounded-md p-8 text-center transition cursor-pointer flex flex-col items-center justify-center min-h-[160px] ${
                              isDragging
                                ? "border-primary bg-neutral"
                                : "border-border bg-neutral/50 hover:bg-neutral hover:border-primary/40"
                            }`}
                          >
                            <div className="w-10 h-10 rounded-full bg-surface border border-border flex items-center justify-center text-primary mb-3">
                              <Upload className="w-4 h-4" />
                            </div>
                            <div className="text-sm font-medium text-primary mb-1">
                              Drop video here, or <span className="underline">browse</span>
                            </div>
                            <p className="text-xs text-secondary">
                              MP4, MOV, or WebM
                            </p>
                          </div>
                        ) : (
                          <div className="p-4 bg-neutral rounded-md border border-border flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-surface border border-border flex items-center justify-center text-primary">
                                <FileVideo className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-medium text-primary max-w-xs truncate">
                                  {selectedFile.name}
                                </div>
                                <div className="text-[11px] text-secondary font-mono">
                                  {formatFileSize(selectedFile.size)}
                                </div>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => setSelectedFile(null)}
                              className="p-1 rounded-full hover:bg-surface text-secondary hover:text-primary transition cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <div className="relative flex items-center">
                          <LinkIcon className="w-4 h-4 text-secondary absolute left-4 pointer-events-none" />
                          <input
                            type="url"
                            value={videoUrl}
                            onChange={(e) => setVideoUrl(e.target.value)}
                            placeholder="Paste video link (YouTube, TikTok, Reels)"
                            className="input-minimal has-left-icon w-full pr-4"
                          />
                        </div>
                      </div>
                    )}

                    {/* Rights Checkbox */}
                    <div className="flex items-center gap-2.5 pt-1">
                      <input
                        type="checkbox"
                        id="rights"
                        checked={rightsConfirmed}
                        onChange={(e) => setRightsConfirmed(e.target.checked)}
                        className="h-3.5 w-3.5 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                      />
                      <label htmlFor="rights" className="text-xs text-secondary cursor-pointer select-none">
                        I have permission to analyze this video.
                      </label>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting || !isFormValid}
                      className="btn-primary w-full"
                    >
                      <span>{isSubmitting ? "Queueing Video..." : "Analyze Video"}</span>
                    </button>

                    {/* Forensic Pipeline Progress Card */}
                    {pipelineProgress && (
                      <IngestProgressCard progress={pipelineProgress} />
                    )}

                    {errorMessage && (
                      <div className="p-4 bg-neutral rounded-md border border-error/30 text-xs space-y-2.5 animate-fade-in">
                        <div className="flex items-start gap-2.5 text-error">
                          <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                          <span className="leading-relaxed">{errorMessage}</span>
                        </div>
                        {sourceType === "youtube" && (
                          <div className="pt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setSourceType("upload");
                                setErrorMessage(null);
                              }}
                              className="btn-secondary text-xs h-8 px-3.5 inline-flex items-center gap-1.5 cursor-pointer"
                            >
                              <Upload className="w-3.5 h-3.5" />
                              <span>Switch to File Upload</span>
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </form>
                </div>
              </div>
            )}

            {/* Active Video Results Section */}
            {pipelineData && (
              <div className="space-y-8 animate-fade-in">
                {/* View Switcher Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-surface p-2.5 rounded-md border border-border gap-3">
                  <div className="flex bg-neutral p-0.5 rounded-full border border-border">
                    <button
                      onClick={() => setActiveTab("autopsy")}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-2 ${
                        activeTab === "autopsy"
                          ? "bg-surface text-primary border border-border"
                          : "text-secondary hover:text-primary"
                      }`}
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Autopsy Report</span>
                    </button>
                    <button
                      onClick={() => setActiveTab("assets")}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-2 ${
                        activeTab === "assets"
                          ? "bg-surface text-primary border border-border"
                          : "text-secondary hover:text-primary"
                      }`}
                    >
                      <Film className="w-3.5 h-3.5" />
                      <span>Extracted Assets</span>
                    </button>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setShowStatsDrawer(true)}
                      className="btn-secondary text-xs flex items-center gap-1.5"
                    >
                      <BarChart3 className="w-3.5 h-3.5 text-secondary" />
                      <span>Stats ({pipelineData.analysis?.stats?.length || 0})</span>
                    </button>

                    <button
                      onClick={() => {
                        setCompareVideoIdA(pipelineData.video_id);
                        setAppMode("compare");
                      }}
                      className="btn-secondary text-xs flex items-center gap-1.5"
                    >
                      <GitCompare className="w-3.5 h-3.5 text-secondary" />
                      <span>Compare</span>
                    </button>

                    <button
                      onClick={() => setAppMode("remix")}
                      className="btn-primary text-xs flex items-center gap-1.5"
                    >
                      <Wand2 className="w-3.5 h-3.5" />
                      <span>Remix Concept</span>
                    </button>
                  </div>
                </div>

                {/* Grounded Frame Inspector Card */}
                <div
                  ref={inspectorRef}
                  className="bg-surface rounded-md p-6 md:p-8 border border-border flex flex-col md:flex-row items-center gap-6"
                >
                  <div className="relative w-44 aspect-[9/16] bg-neutral rounded-md border border-border overflow-hidden flex-shrink-0">
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
                      <div className="w-full h-full flex items-center justify-center text-secondary text-xs font-mono">
                        No Frame
                      </div>
                    )}
                    <div className="absolute top-2 left-2 chip-minimal text-[10px] py-0.5 px-2">
                      {selectedFrame ? formatMs(selectedFrame.t_ms) : "00:00.00"}
                    </div>
                    {selectedFrame?.is_keyframe && (
                      <div className="absolute bottom-2 right-2 bg-primary text-tertiary text-[9px] font-medium px-1.5 py-0.5 rounded-full">
                        Keyframe
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="chip-minimal text-[10px] uppercase font-medium">
                        Visual Evidence
                      </span>
                      <span className="text-xs font-mono text-secondary">
                        {selectedFrame ? `${selectedFrame.t_ms} ms (${formatMs(selectedFrame.t_ms)})` : "0 ms"}
                      </span>
                    </div>

                    <h4 className="text-lg font-normal tracking-tight text-primary">
                      Frame &amp; Acoustic Snapshot
                    </h4>

                    <p className="text-sm text-secondary leading-relaxed">
                      Every score and critique in ReelBrain is anchored to concrete visual or acoustic evidence at this millisecond mark.
                    </p>

                    <div className="pt-2 flex flex-wrap gap-2 text-xs">
                      <div className="p-3 bg-neutral rounded-md border border-border flex-1 min-w-[200px]">
                        <span className="text-[10px] font-medium uppercase tracking-wider text-secondary block mb-1">
                          Spoken Audio
                        </span>
                        <span className="font-normal text-primary text-xs">
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
                        <div className="p-3 bg-neutral rounded-md border border-border flex-1 min-w-[200px]">
                          <span className="text-[10px] font-medium uppercase tracking-wider text-secondary block mb-1">
                            On-Screen Text (OCR)
                          </span>
                          <span className="font-normal text-primary text-xs">
                            {pipelineData.ocr
                              .filter((item) => Math.abs(item.keyframe_ms - selectedFrame.t_ms) <= 1500)
                              .flatMap((item) => item.texts.map((t) => t.text))
                              .join(" • ") || "No text overlay detected."}
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
                        onOpenRemix={() => setAppMode("remix")}
                      />
                    ) : isAnalyzing ? (
                      <AutopsyScanner
                        durationS={pipelineData.metadata.duration_s}
                        frameCount={pipelineData.frames.length}
                        cutCount={pipelineData.scenes.length}
                      />
                    ) : (
                      <div className="p-12 bg-surface rounded-md border border-border text-center space-y-4">
                        <div className="w-12 h-12 rounded-full bg-neutral border border-border flex items-center justify-center text-primary mx-auto">
                          <Sparkles className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-normal tracking-tight text-primary">
                          Autopsy Analysis Engine Ready
                        </h3>
                        <p className="text-sm text-secondary max-w-md mx-auto">
                          All media frames, transcript words, and acoustic curves are extracted. Synthesize the 7-score matrix and blueprint.
                        </p>
                        <button
                          onClick={handleRunAnalysis}
                          disabled={isAnalyzing}
                          className="btn-primary"
                        >
                          Generate Autopsy Report
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: RAW ASSETS INSPECTOR */}
                {activeTab === "assets" && (
                  <section className="bg-surface rounded-md p-6 md:p-8 border border-border mb-12 animate-fade-in">
                    <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-border gap-4 mb-6">
                      <div>
                        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral border border-border text-primary mb-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-primary" />
                          <span>Pipeline Completed (100%)</span>
                        </div>
                        <h2 className="text-xl md:text-2xl font-normal tracking-tight text-primary">
                          Extracted Media Assets &amp; Timestamps
                        </h2>
                        <p className="text-xs text-secondary mt-1 font-mono">
                          ID: {pipelineData.video_id} • {pipelineData.metadata.duration_s}s duration • {pipelineData.metadata.width}x{pipelineData.metadata.height} @ {pipelineData.metadata.fps}fps
                        </p>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-sm font-medium text-primary flex items-center gap-2">
                          <Film className="w-4 h-4 text-primary" />
                          <span>1 FPS Extracted Frames ({pipelineData.frames.length} total)</span>
                        </h3>
                        <span className="text-xs text-secondary">Click any frame to inspect timestamp</span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 overflow-x-auto pb-2">
                        {pipelineData.frames.map((frame, idx) => (
                          <div
                            key={idx}
                            onClick={() => handleSelectTimestamp(frame.t_ms)}
                            className={`p-1 rounded-md cursor-pointer transition border ${
                              selectedFrame?.t_ms === frame.t_ms
                                ? "border-primary bg-neutral"
                                : "border-border hover:border-secondary"
                            }`}
                          >
                            <div className="relative aspect-[9/16] bg-neutral rounded-sm overflow-hidden flex items-center justify-center">
                              <img
                                src={`${API_BASE_URL}/storage/thumbs/${pipelineData.video_id}/${frame.t_ms}.jpg`}
                                alt={`Frame at ${frame.t_ms}ms`}
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  (e.target as HTMLElement).style.display = "none";
                                }}
                              />
                              <div className="absolute top-1.5 left-1.5 chip-minimal text-[9px] py-0 px-1.5">
                                {formatMs(frame.t_ms)}
                              </div>
                              {frame.is_keyframe && (
                                <div className="absolute bottom-1.5 right-1.5 bg-primary text-tertiary text-[8px] font-medium px-1.5 py-0.5 rounded-full">
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

        {/* MODE B: COMPARE STUDIO */}
        {appMode === "compare" && (
          <div className="space-y-8 animate-fade-in">
            <div className="text-center max-w-2xl mx-auto mb-10">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-neutral border border-border text-xs font-medium text-primary mb-3">
                <GitCompare className="w-3.5 h-3.5 text-primary" />
                <span>Side-by-Side Blueprint Diff Engine</span>
              </div>
              <h2 className="text-3xl md:text-4xl font-normal tracking-[-3.36px] text-primary mb-3">
                Compare Winner vs Flop
              </h2>
              <p className="text-sm text-secondary">
                Align narrative beats, score deltas, and pacing velocity. Every claim cites exact timestamps.
              </p>
            </div>

            <div className="max-w-2xl mx-auto bg-surface rounded-md p-6 md:p-8 border border-border">
              <form onSubmit={handleRunCompare} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-medium text-secondary mb-2">
                      Video A ID (Baseline or Winner)
                    </label>
                    <input
                      type="text"
                      value={compareVideoIdA}
                      onChange={(e) => setCompareVideoIdA(e.target.value)}
                      placeholder="e.g. 7481ba93-..."
                      className="input-minimal w-full font-mono text-xs"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-secondary mb-2">
                      Video B ID (Comparison Concept)
                    </label>
                    <input
                      type="text"
                      value={compareVideoIdB}
                      onChange={(e) => setCompareVideoIdB(e.target.value)}
                      placeholder="e.g. 81a942df-..."
                      className="input-minimal w-full font-mono text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-2 border-t border-border">
                  <span className="text-xs text-secondary">
                    Both videos must be analyzed before running blueprint diff.
                  </span>

                  <button
                    type="submit"
                    disabled={isComparing || !compareVideoIdA || !compareVideoIdB}
                    className="btn-primary"
                  >
                    <GitCompare className="w-4 h-4 mr-1.5" />
                    <span>{isComparing ? "Aligning Blueprints..." : "Run Diff Comparison"}</span>
                  </button>
                </div>

                {errorMessage && (
                  <div className="p-3 bg-neutral text-error text-xs font-normal rounded-md border border-error/30 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span>{errorMessage}</span>
                  </div>
                )}
              </form>
            </div>

            {compareReport && (
              <CompareViewer report={compareReport} />
            )}
          </div>
        )}

        {/* MODE C: PERSISTENT BRAIN MEMORY & CREATION INTELLIGENCE */}
        {appMode === "brain" && (
          <BrainViewer
            onLaunchRemix={(product, platform, durationS) => {
              setRemixPrefill({
                topic: product,
                platform: platform as any,
                durationS: durationS,
              });
              setAppMode("remix");
            }}
            onSelectVideoForAutopsy={(vidId) => {
              setVideoId(vidId);
              fetchPipelineData(vidId);
              setAppMode("autopsy");
            }}
          />
        )}

        {/* MODE D: REMIX CONCEPT STUDIO */}
        {appMode === "remix" && (
          <RemixStudio
            sourceVideoId={pipelineData?.video_id || compareVideoIdA || "g1_product_ad"}
            initialProductOrTopic={remixPrefill.topic}
            initialPlatform={remixPrefill.platform}
            initialDurationS={remixPrefill.durationS}
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

      {/* Minimal Footer */}
      <footer className="border-t border-border py-8 px-6 bg-surface mt-16 text-xs text-secondary">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-sm bg-primary flex items-center justify-center text-tertiary text-[10px] font-medium">
              ▲
            </div>
            <span className="font-medium text-primary">ReelBrain</span>
            <span>&copy; 2026. Video Autopsy &amp; Remix Engine.</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hover:text-primary cursor-pointer transition">Docs</span>
            <span className="hover:text-primary cursor-pointer transition">Privacy</span>
            <span className="hover:text-primary cursor-pointer transition">Originality Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
