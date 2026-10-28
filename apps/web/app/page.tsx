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
import { SystemSpecs } from "../components/SystemSpecs";
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
  const [appMode, setAppMode] = useState<"autopsy" | "brain" | "compare" | "remix" | "system">("autopsy");
  const [remixPrefill, setRemixPrefill] = useState<{
    topic?: string;
    platform?: "tiktok" | "reels" | "youtube_shorts";
    durationS?: number;
  }>({});
  const [sourceType, setSourceType] = useState<"upload" | "youtube">("upload");
  const [videoUrl, setVideoUrl] = useState("");
  const [knownViews, setKnownViews] = useState("");
  const [knownLikes, setKnownLikes] = useState("");
  const [showEngagementInputs, setShowEngagementInputs] = useState(false);
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
  const [activeTab, setActiveTab] = useState<"autopsy" | "assets" | "thoughts">("autopsy");

  // Director Thoughts & Viral Psychology State
  const [creatorThoughts, setCreatorThoughts] = useState({
    what: "",
    why: "",
    how: "",
    psychology: "",
    visual_build: "",
    notes: "",
  });
  const [isSavingThoughts, setIsSavingThoughts] = useState(false);
  const [thoughtsSavedTime, setThoughtsSavedTime] = useState<string | null>(null);
  const [allBrainThoughts, setAllBrainThoughts] = useState<any[]>([]);

  const parseCount = (val: string): number | null => {
    if (!val || !val.trim()) return null;
    const clean = val.trim().toLowerCase();
    if (clean.endsWith("m")) {
      const n = parseFloat(clean.replace("m", ""));
      return isNaN(n) ? null : n * 1_000_000;
    }
    if (clean.endsWith("k")) {
      const n = parseFloat(clean.replace("k", ""));
      return isNaN(n) ? null : n * 1_000;
    }
    const num = parseFloat(clean.replace(/,/g, ""));
    return isNaN(num) ? null : num;
  };

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

        // Fetch creator thoughts for this video
        fetch(`${API_BASE_URL}/v1/videos/${vid}/thoughts`)
          .then((r) => r.json())
          .then((td) => {
            if (td?.thoughts) {
              setCreatorThoughts(td.thoughts);
              setThoughtsSavedTime(td.thoughts.created_at);
            } else {
              setCreatorThoughts({
                what: "",
                why: "",
                how: "",
                psychology: "",
                visual_build: "",
                notes: "",
              });
              setThoughtsSavedTime(null);
            }
          })
          .catch(() => {});

        // Fetch global cross-video brain rules
        fetch(`${API_BASE_URL}/v1/brain`)
          .then((r) => r.json())
          .then((bd) => {
            if (bd?.creator_psychology_rules) {
              setAllBrainThoughts(bd.creator_psychology_rules);
            }
          })
          .catch(() => {});
      }
    } catch (err) {
      console.error("Error loading pipeline data", err);
    }
  };

  const handleSaveThoughts = async (overrides?: any) => {
    if (!videoId) return;
    setIsSavingThoughts(true);
    const payload = overrides || creatorThoughts;
    try {
      const res = await fetch(`${API_BASE_URL}/v1/videos/${videoId}/thoughts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        const d = await res.json();
        setThoughtsSavedTime(d.thoughts.created_at);
        const bRes = await fetch(`${API_BASE_URL}/v1/brain`);
        if (bRes.ok) {
          const bd = await bRes.json();
          setAllBrainThoughts(bd.creator_psychology_rules || []);
        }
      }
    } catch (err) {
      console.error("Failed to save creator thoughts", err);
    } finally {
      setIsSavingThoughts(false);
    }
  };

  const handleAutoSuggestThoughts = () => {
    if (!pipelineData?.analysis) return;
    const rep = pipelineData.analysis;
    const openingWords = rep.blueprint?.[0]?.technique || "Pattern interrupt opening with fast hook";
    const whyItWorks = rep.why_it_works?.[0]?.claim || rep.verdict;
    const psychologyTrigger = rep.why_it_works?.find(w => w.category === "emotion" || w.category === "retention")?.claim || "High curiosity gap with immediate visual contrast and dopamine spike";
    const scenesCount = pipelineData.scenes?.length || 1;
    const cutSec = (pipelineData.metadata.duration_s / Math.max(scenesCount, 1)).toFixed(1);

    const newThoughts = {
      what: `Visual: ${rep.design_language?.motion_style || 'Dynamic tracking'}. Opening: ${openingWords}. Rhythm: 1 cut every ${cutSec}s across ${scenesCount} scenes.`,
      why: whyItWorks || "Bold premise challenges viewer expectation in first 2 seconds.",
      how: `Hook holds ${rep.scores?.hook || 85}% retention score. Emotional curve climbs from curiosity to payoff without dead air.`,
      psychology: psychologyTrigger,
      visual_build: rep.blueprint?.map((b: any) => `${b.role}: ${b.technique}`).slice(0, 3).join(" → ") || "Hook → Agitation → Payoff",
      notes: "Auto-extracted from frame autopsy. Edit or refine your own creator intuition.",
    };
    setCreatorThoughts(newThoughts);
    handleSaveThoughts(newThoughts);
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
      const viewsNum = parseCount(knownViews);
      const likesNum = parseCount(knownLikes);

      if (sourceType === "upload" && selectedFile) {
        const formData = new FormData();
        formData.append("file", selectedFile);
        formData.append("rights_confirmed", "true");
        if (viewsNum !== null && viewsNum > 0) formData.append("known_views", viewsNum.toString());
        if (likesNum !== null && likesNum > 0) formData.append("known_likes", likesNum.toString());

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
        const urlLower = videoUrl.trim().toLowerCase();
        let detectedPlatform = "youtube";
        if (urlLower.includes("tiktok.com")) detectedPlatform = "tiktok";
        else if (urlLower.includes("instagram.com")) detectedPlatform = "instagram";

        const response = await fetch(`${API_BASE_URL}/v1/videos`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source_type: detectedPlatform,
            source_url: videoUrl.trim(),
            rights_confirmed: true,
            known_views: viewsNum || undefined,
            known_likes: likesNum || undefined,
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
          className="flex items-center gap-2.5 cursor-pointer select-none"
        >
          <img
            src="/logo.png"
            alt="ReelBrain"
            className="h-6 w-auto object-contain hover:opacity-90 transition"
          />
        </div>

        {/* Center: Monochrome 5-Mode Segmented Pill */}
        <div className="flex items-center bg-neutral p-0.5 rounded-full border border-border">
          <button
            onClick={() => setAppMode("autopsy")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              appMode === "autopsy"
                ? "bg-surface text-primary border border-border shadow-none"
                : "text-secondary hover:text-primary"
            }`}
          >
            Autopsy
          </button>
          <button
            onClick={() => setAppMode("brain")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              appMode === "brain"
                ? "bg-surface text-primary border border-border shadow-none"
                : "text-secondary hover:text-primary"
            }`}
          >
            Brain
          </button>
          <button
            onClick={() => setAppMode("compare")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              appMode === "compare"
                ? "bg-surface text-primary border border-border shadow-none"
                : "text-secondary hover:text-primary"
            }`}
          >
            Compare
          </button>
          <button
            onClick={() => setAppMode("remix")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              appMode === "remix"
                ? "bg-surface text-primary border border-border shadow-none"
                : "text-secondary hover:text-primary"
            }`}
          >
            Remix
          </button>
          <button
            onClick={() => setAppMode("system")}
            className={`px-3 py-1 rounded-full text-xs font-medium transition cursor-pointer ${
              appMode === "system"
                ? "bg-surface text-primary border border-border shadow-none"
                : "text-secondary hover:text-primary"
            }`}
          >
            System
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
            <div className="absolute right-0 mt-2 w-56 bg-surface rounded-md border border-border p-1.5 z-50 text-xs space-y-0.5 shadow-sm">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between text-secondary">
                <span>Backend API</span>
                <span className="font-mono text-[11px] text-primary">Port 8001</span>
              </div>
              <button
                onClick={() => {
                  setShowOverflowMenu(false);
                  setAppMode("system");
                }}
                className="w-full text-left px-3 py-2 rounded-sm hover:bg-neutral text-primary font-normal transition cursor-pointer"
              >
                System Specs &amp; Upgrades
              </button>
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
                            placeholder="Paste video link (YouTube Shorts, YouTube, TikTok, Direct MP4)"
                            className="input-minimal has-left-icon w-full pr-4"
                          />
                        </div>
                        <div className="mt-1.5 flex items-center gap-1.5 text-[11px] text-secondary font-mono">
                          <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          <span>YouTube Shorts, YouTube, &amp; TikTok supported directly.</span>
                        </div>
                      </div>
                    )}

                    {/* Optional Real-World Engagement Disclosure */}
                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => setShowEngagementInputs(!showEngagementInputs)}
                        className="text-xs text-secondary hover:text-primary transition flex items-center gap-1.5 cursor-pointer font-mono"
                      >
                        <span>{showEngagementInputs ? "▾" : "▸"}</span>
                        <span>Optional: Known views &amp; likes</span>
                        {sourceType === "youtube" && (
                          <span className="text-[10px] text-secondary">(Auto-extracted if link has metrics)</span>
                        )}
                      </button>

                      {showEngagementInputs && (
                        <div className="grid grid-cols-2 gap-3 mt-2.5 p-3 bg-neutral rounded-md border border-border animate-fade-in">
                          <div>
                            <label className="text-[11px] font-mono text-secondary block mb-1">
                              Views (e.g. 167M or 100000)
                            </label>
                            <input
                              type="text"
                              value={knownViews}
                              onChange={(e) => setKnownViews(e.target.value)}
                              placeholder="167.9M"
                              className="input-minimal w-full text-xs"
                            />
                          </div>
                          <div>
                            <label className="text-[11px] font-mono text-secondary block mb-1">
                              Likes (e.g. 25.5M or 50000)
                            </label>
                            <input
                              type="text"
                              value={knownLikes}
                              onChange={(e) => setKnownLikes(e.target.value)}
                              placeholder="25.6M"
                              className="input-minimal w-full text-xs"
                            />
                          </div>
                        </div>
                      )}
                    </div>

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
                    <button
                      onClick={() => setActiveTab("thoughts")}
                      className={`px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center gap-2 ${
                        activeTab === "thoughts"
                          ? "bg-surface text-primary border border-border"
                          : "text-secondary hover:text-primary"
                      }`}
                    >
                      <Brain className="w-3.5 h-3.5" />
                      <span>Viral Thoughts &amp; Psychology</span>
                      {thoughtsSavedTime && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                      )}
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
                      <>
                        <ReportViewer
                          videoId={pipelineData.video_id}
                          report={pipelineData.analysis}
                          durationMs={pipelineData.metadata.duration_ms}
                          onSelectTimestamp={handleSelectTimestamp}
                          selectedTimestamp={selectedTimestamp}
                          onOpenStatsDrawer={() => setShowStatsDrawer(true)}
                          onOpenRemix={() => setAppMode("remix")}
                        />

                        {/* Inline Creator Viral Mind Box */}
                        <div className="mt-8 bg-surface rounded-md p-6 border border-border">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border">
                            <div className="flex items-center gap-2.5">
                              <div className="w-8 h-8 rounded-full bg-neutral border border-border flex items-center justify-center text-primary">
                                <Brain className="w-4 h-4" />
                              </div>
                              <div>
                                <h3 className="text-sm font-medium text-primary">
                                  Teach the Brain: What, Why &amp; How Did This Go Viral?
                                </h3>
                                <p className="text-[11px] text-secondary">
                                  Store your insights into the Brain memory so future videos understand the psychology &amp; visual build.
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={handleAutoSuggestThoughts}
                                className="btn-secondary text-xs flex items-center gap-1.5 py-1 px-3 cursor-pointer"
                              >
                                <Sparkles className="w-3.5 h-3.5 text-secondary" />
                                <span>Auto-Fill from Autopsy</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveTab("thoughts")}
                                className="btn-secondary text-xs flex items-center gap-1 py-1 px-3 cursor-pointer"
                              >
                                <span>Full Mind &amp; Cross-Video Stream</span>
                                <ChevronRight className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-5">
                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-mono font-medium text-primary">
                                  1. WHAT is happening visually?
                                </label>
                              </div>
                              <textarea
                                rows={3}
                                value={creatorThoughts.what}
                                onChange={(e) => setCreatorThoughts({ ...creatorThoughts, what: e.target.value })}
                                placeholder="e.g. Extreme macro push-in on product, bold text pop, 0.4s fast micro-cuts."
                                className="input-minimal w-full text-xs p-3 resize-none font-normal"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-mono font-medium text-primary">
                                  2. WHY did this go viral?
                                </label>
                              </div>
                              <textarea
                                rows={3}
                                value={creatorThoughts.why}
                                onChange={(e) => setCreatorThoughts({ ...creatorThoughts, why: e.target.value })}
                                placeholder="e.g. Bold contrarian statement challenges viewer belief; high curiosity gap with zero fluff."
                                className="input-minimal w-full text-xs p-3 resize-none font-normal"
                              />
                            </div>

                            <div>
                              <div className="flex items-center justify-between mb-1.5">
                                <label className="text-xs font-mono font-medium text-primary">
                                  3. HOW does the psychology work?
                                </label>
                              </div>
                              <textarea
                                rows={3}
                                value={creatorThoughts.how}
                                onChange={(e) => setCreatorThoughts({ ...creatorThoughts, how: e.target.value })}
                                placeholder="e.g. Pattern interrupt breaks doomscroll trance; dopamine release at 0:03 keeps retention high."
                                className="input-minimal w-full text-xs p-3 resize-none font-normal"
                              />
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                            <span className="text-[11px] text-secondary font-mono">
                              {thoughtsSavedTime ? (
                                <span className="text-emerald-500 flex items-center gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                                  Stored in Brain Memory ({allBrainThoughts.length} cross-video rules active)
                                </span>
                              ) : (
                                "Record what you observed to train the Brain."
                              )}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleSaveThoughts()}
                              disabled={isSavingThoughts}
                              className="btn-primary text-xs py-1.5 px-4 flex items-center gap-1.5"
                            >
                              <Brain className="w-3.5 h-3.5" />
                              <span>{isSavingThoughts ? "Memorizing..." : "Save & Feed into Brain"}</span>
                            </button>
                          </div>
                        </div>
                      </>
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

                {/* TAB 3: VIRAL THOUGHTS & CROSS-VIDEO PSYCHOLOGY */}
                {activeTab === "thoughts" && (
                  <div className="space-y-8 animate-fade-in">
                    {/* Top Header Card */}
                    <div className="bg-surface rounded-md p-6 md:p-8 border border-border">
                      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border">
                        <div>
                          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-neutral border border-border text-primary mb-2">
                            <Brain className="w-3.5 h-3.5 text-primary" />
                            <span>Director Brain &amp; Cross-Video Psychology</span>
                          </div>
                          <h2 className="text-2xl font-normal tracking-tight text-primary">
                            Train the Brain on Why This Video Works
                          </h2>
                          <p className="text-xs text-secondary mt-1 max-w-2xl">
                            Type your thoughts on the visual building blocks and subconscious psychology. The Brain memorizes this video-by-video so future videos automatically cross-reference these patterns.
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={handleAutoSuggestThoughts}
                            className="btn-secondary text-xs flex items-center gap-1.5"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span>Auto-Fill from Autopsy</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveThoughts()}
                            disabled={isSavingThoughts}
                            className="btn-primary text-xs flex items-center gap-1.5"
                          >
                            <Brain className="w-3.5 h-3.5" />
                            <span>{isSavingThoughts ? "Memorizing..." : "Save to Brain Mind"}</span>
                          </button>
                        </div>
                      </div>

                      {/* 3 Core Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-mono font-medium text-primary">
                              1. WHAT is happening visually?
                            </label>
                            <span className="text-[10px] text-secondary font-mono">Visual Build</span>
                          </div>
                          <textarea
                            rows={4}
                            value={creatorThoughts.what}
                            onChange={(e) => setCreatorThoughts({ ...creatorThoughts, what: e.target.value })}
                            placeholder="Describe visual framing, props, text overlays, motion, color grading, and camera cut rhythm."
                            className="input-minimal w-full text-xs p-3 font-normal"
                          />
                          <p className="text-[11px] text-secondary">
                            e.g. 0.3s micro-cuts, dynamic macro tracking, eye-level contrast, zero camera shake.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-mono font-medium text-primary">
                              2. WHY did this go viral?
                            </label>
                            <span className="text-[10px] text-secondary font-mono">Virality Hook</span>
                          </div>
                          <textarea
                            rows={4}
                            value={creatorThoughts.why}
                            onChange={(e) => setCreatorThoughts({ ...creatorThoughts, why: e.target.value })}
                            placeholder="What stops doomscrolling? What sparks shares, comments, or looping?"
                            className="input-minimal w-full text-xs p-3 font-normal"
                          />
                          <p className="text-[11px] text-secondary">
                            e.g. Contrarian opening challenges status quo; curiosity gap forces viewer to watch till 0:15.
                          </p>
                        </div>

                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="text-xs font-mono font-medium text-primary">
                              3. HOW does the psychology work?
                            </label>
                            <span className="text-[10px] text-secondary font-mono">Subconscious Trigger</span>
                          </div>
                          <textarea
                            rows={4}
                            value={creatorThoughts.how}
                            onChange={(e) => setCreatorThoughts({ ...creatorThoughts, how: e.target.value })}
                            placeholder="Subconscious emotional drivers: identity affirmation, fear of missing out, dopamine spikes, cognitive ease."
                            className="input-minimal w-full text-xs p-3 font-normal"
                          />
                          <p className="text-[11px] text-secondary">
                            e.g. Audience feels understood in first 2 seconds; tension builds with proof before climax.
                          </p>
                        </div>
                      </div>

                      {/* Additional Notes & Blueprint */}
                      <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <label className="text-xs font-mono font-medium text-primary block mb-2">
                            Visual Building Blocks &amp; Blueprint Sequence
                          </label>
                          <textarea
                            rows={2}
                            value={creatorThoughts.visual_build}
                            onChange={(e) => setCreatorThoughts({ ...creatorThoughts, visual_build: e.target.value })}
                            placeholder="e.g. Beat 1: Hook (0-3s) → Beat 2: Problem agitation → Beat 3: Visual demo → Beat 4: Resolution CTA"
                            className="input-minimal w-full text-xs p-3 font-normal"
                          />
                        </div>

                        <div>
                          <label className="text-xs font-mono font-medium text-primary block mb-2">
                            Creator Takeaway &amp; Golden Rule
                          </label>
                          <textarea
                            rows={2}
                            value={creatorThoughts.notes}
                            onChange={(e) => setCreatorThoughts({ ...creatorThoughts, notes: e.target.value })}
                            placeholder="e.g. Never spend more than 1.5 seconds establishing context; cut straight to the visual transformation."
                            className="input-minimal w-full text-xs p-3 font-normal"
                          />
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                        <div className="flex items-center gap-2">
                          {thoughtsSavedTime ? (
                            <span className="text-xs text-emerald-500 font-mono flex items-center gap-1.5">
                              <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                              Active in Brain Mind • Last synchronized: {new Date(thoughtsSavedTime).toLocaleTimeString()}
                            </span>
                          ) : (
                            <span className="text-xs text-secondary font-mono">
                              Draft not yet persisted into Brain.
                            </span>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => handleSaveThoughts()}
                          disabled={isSavingThoughts}
                          className="btn-primary text-xs py-2 px-5 flex items-center gap-2"
                        >
                          <Brain className="w-4 h-4" />
                          <span>{isSavingThoughts ? "Memorizing..." : "Save & Feed into Brain"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Cross-Video Brain Intelligence Archive */}
                    <div className="bg-surface rounded-md p-6 md:p-8 border border-border">
                      <div className="flex items-center justify-between pb-4 border-b border-border">
                        <div>
                          <h3 className="text-base font-normal text-primary flex items-center gap-2">
                            <Layers className="w-4 h-4 text-primary" />
                            <span>Cumulative Brain Memory ({allBrainThoughts.length} Learned Rules)</span>
                          </h3>
                          <p className="text-xs text-secondary mt-0.5">
                            Cross-video psychological principles stored across all analyzed videos.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setAppMode("brain")}
                          className="btn-secondary text-xs flex items-center gap-1"
                        >
                          <span>Open Brain Studio</span>
                          <ChevronRight className="w-3 h-3" />
                        </button>
                      </div>

                      {allBrainThoughts.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
                          {allBrainThoughts.map((rule, idx) => (
                            <div key={idx} className="p-4 bg-neutral rounded-md border border-border space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="chip-minimal text-[10px] font-mono">
                                  {rule.category?.toUpperCase() || "CREATIVE"} • {rule.virality_tier || "VIRAL"}
                                </span>
                                <span className="text-[10px] text-secondary font-mono">
                                  {rule.created_at ? new Date(rule.created_at).toLocaleDateString() : "Saved"}
                                </span>
                              </div>

                              {rule.what && (
                                <div>
                                  <div className="text-[10px] font-mono text-secondary uppercase">What happens</div>
                                  <div className="text-xs text-primary font-normal mt-0.5 line-clamp-2">{rule.what}</div>
                                </div>
                              )}

                              {rule.why && (
                                <div>
                                  <div className="text-[10px] font-mono text-secondary uppercase">Why it works</div>
                                  <div className="text-xs text-primary font-normal mt-0.5 line-clamp-2">{rule.why}</div>
                                </div>
                              )}

                              {rule.psychology && (
                                <div>
                                  <div className="text-[10px] font-mono text-secondary uppercase">Psychology trigger</div>
                                  <div className="text-xs text-emerald-400 font-normal mt-0.5 line-clamp-2">{rule.psychology}</div>
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-8 text-center text-xs text-secondary">
                          No cross-video thoughts recorded yet. Fill out the fields above to start training the Brain!
                        </div>
                      )}
                    </div>
                  </div>
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

        {/* MODE E: SYSTEM SPECS, STACK & UPGRADE BLUEPRINT */}
        {appMode === "system" && <SystemSpecs />}
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
          <div className="flex items-center gap-2.5">
            <img
              src="/logo.png"
              alt="ReelBrain"
              className="h-4 w-auto object-contain opacity-80"
            />
            <span className="text-secondary/60">&copy; 2026. Video Autopsy &amp; Remix Engine.</span>
          </div>
          <div className="flex items-center gap-6">
            <span
              onClick={() => setAppMode("system")}
              className="hover:text-primary cursor-pointer transition font-medium text-primary/80"
            >
              System &amp; Architecture
            </span>
            <span className="hover:text-primary cursor-pointer transition">Privacy</span>
            <span className="hover:text-primary cursor-pointer transition">Originality Policy</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
