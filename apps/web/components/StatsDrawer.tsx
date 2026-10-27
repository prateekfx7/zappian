"use client";

import React, { useState } from "react";
import {
  X,
  Upload,
  Plus,
  BarChart3,
  Tag,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
} from "lucide-react";
import { API_BASE_URL } from "../lib/api";

interface StatItem {
  metric: string;
  value: number;
  source: string;
  fetched_at: string;
}

interface StatsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  videoId: string;
  stats: StatItem[];
  onStatsUpdated: (updatedStats: StatItem[]) => void;
}

export function StatsDrawer({
  isOpen,
  onClose,
  videoId,
  stats,
  onStatsUpdated,
}: StatsDrawerProps) {
  const [metricName, setMetricName] = useState("views");
  const [metricValue, setMetricValue] = useState("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddManual = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!metricValue) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const res = await fetch(`${API_BASE_URL}/v1/videos/${videoId}/stats`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          metric: metricName,
          value: parseFloat(metricValue.replace(/,/g, "")),
          source: "manual",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to save manual metric.");
      }

      const updated = await res.json();
      onStatsUpdated(updated);
      setMetricValue("");
      setMessage(`Added ${metricName} with verified 'manual' source label.`);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to update stats.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUploadCsv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvFile) return;

    setIsSubmitting(true);
    setErrorMessage(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", csvFile);

      const res = await fetch(`${API_BASE_URL}/v1/videos/${videoId}/stats/csv`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "CSV upload rejected.");
      }

      const updated = await res.json();
      onStatsUpdated(updated);
      setCsvFile(null);
      setMessage("CSV metrics successfully imported and attributed to 'csv' source.");
    } catch (err: any) {
      setErrorMessage(err.message || "CSV processing failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 animate-fade-in">
      <div className="bg-white rounded-pin-lg w-full max-w-xl p-8 border border-hairline shadow-xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-6 right-6 p-2 rounded-full hover:bg-secondary-bg text-mute hover:text-ink transition"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="mb-6">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary mb-2">
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Rule 2 Audit Verified</span>
          </div>
          <h3 className="text-xl font-bold text-ink">
            Video Performance Metrics &amp; Sources
          </h3>
          <p className="text-xs text-mute mt-1">
            FrameDNA never guesses sales or platform data from video frames. Every stat must carry an explicit origin.
          </p>
        </div>

        {/* Existing Stats Grid */}
        <div className="mb-6">
          <h4 className="text-xs font-bold uppercase tracking-wider text-mute mb-3">
            Current Associated Metrics ({stats.length})
          </h4>

          {stats.length > 0 ? (
            <div className="grid grid-cols-2 gap-3">
              {stats.map((s, idx) => (
                <div key={idx} className="p-3 bg-surface-card rounded-pin border border-hairline">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-mute mb-0.5">
                    {s.metric.replace(/_/g, " ")}
                  </div>
                  <div className="text-lg font-black text-ink">
                    {s.value.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-primary font-semibold flex items-center gap-1 mt-1">
                    <Tag className="w-3 h-3" />
                    <span>Source: {s.source}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-mute italic p-4 bg-surface-card rounded-pin text-center">
              No platform metrics added yet. Showing "Sales Potential (estimate)" in report.
            </p>
          )}
        </div>

        {/* Form 1: Add Single Metric */}
        <div className="p-5 bg-surface-card rounded-pin border border-hairline mb-6">
          <h4 className="text-xs font-bold text-ink mb-3 flex items-center gap-1.5">
            <Plus className="w-4 h-4 text-primary" />
            <span>Add Single Metric (Manual Source)</span>
          </h4>

          <form onSubmit={handleAddManual} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mute mb-1">
                  Metric
                </label>
                <select
                  value={metricName}
                  onChange={(e) => setMetricName(e.target.value)}
                  className="w-full bg-white border border-stone rounded-xl py-2 px-3 text-xs text-ink outline-none focus:border-primary"
                >
                  <option value="views">Views</option>
                  <option value="likes">Likes</option>
                  <option value="comments">Comments</option>
                  <option value="shares">Shares</option>
                  <option value="saves">Saves</option>
                  <option value="spend">Ad Spend ($)</option>
                  <option value="sales">Sales (Units)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-mute mb-1">
                  Value
                </label>
                <input
                  type="number"
                  step="any"
                  value={metricValue}
                  onChange={(e) => setMetricValue(e.target.value)}
                  placeholder="e.g. 150000"
                  className="w-full bg-white border border-stone rounded-xl py-2 px-3 text-xs text-ink outline-none focus:border-primary"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting || !metricValue}
              className="w-full py-2.5 rounded-full text-xs font-bold bg-ink text-white hover:bg-ink/80 transition cursor-pointer"
            >
              Add Verified Stat
            </button>
          </form>
        </div>

        {/* Form 2: Upload CSV */}
        <div className="p-5 bg-surface-card rounded-pin border border-hairline">
          <h4 className="text-xs font-bold text-ink mb-3 flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-primary" />
            <span>Upload Metrics CSV (Batch Import)</span>
          </h4>

          <form onSubmit={handleUploadCsv} className="space-y-3">
            <input
              type="file"
              accept=".csv"
              onChange={(e) => setCsvFile(e.target.files?.[0] || null)}
              className="block w-full text-xs text-mute file:mr-3 file:py-1.5 file:px-3 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-white file:text-ink hover:file:bg-secondary-bg cursor-pointer"
            />

            <button
              type="submit"
              disabled={isSubmitting || !csvFile}
              className="w-full py-2.5 rounded-full text-xs font-bold bg-primary text-white hover:bg-primary-pressed transition cursor-pointer disabled:opacity-50"
            >
              Upload &amp; Tag Source
            </button>
          </form>
        </div>

        {/* Status / Notifications */}
        {message && (
          <div className="mt-4 p-3 bg-emerald-50 text-emerald-800 text-xs font-medium rounded-pin border border-emerald-200 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
            <span>{message}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mt-4 p-3 bg-rose-50 text-rose-800 text-xs font-medium rounded-pin border border-rose-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}
      </div>
    </div>
  );
}
