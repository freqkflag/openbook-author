"use client";

import { useEffect, useState } from "react";
import { Check, AlertCircle, Loader2, CloudOff } from "lucide-react";

interface SaveStatusBadgeProps {
  status: "idle" | "saving" | "saved" | "error";
  error?: string | null;
  hasPackagePath?: boolean;
  lastSavedAt?: string | null;
}

function formatRelativeTime(iso: string): string {
  const then = new Date(iso).getTime();
  const seconds = Math.floor((Date.now() - then) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function SaveStatusBadge({
  status,
  error,
  hasPackagePath,
  lastSavedAt,
}: SaveStatusBadgeProps) {
  const [, tick] = useState(0);

  useEffect(() => {
    if (!lastSavedAt || status === "saving") return;
    const id = setInterval(() => tick((n) => n + 1), 30000);
    return () => clearInterval(id);
  }, [lastSavedAt, status]);

  const relativeSaved = lastSavedAt ? formatRelativeTime(lastSavedAt) : null;

  if (status === "saving") {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 shadow-[0_0_8px_rgba(0,229,255,0.25)]"
        role="status"
        aria-live="polite"
      >
        <Loader2 size={12} className="animate-spin" aria-hidden />
        Saving…
      </span>
    );
  }

  if (status === "error") {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-300 border border-red-500/30 max-w-[200px] truncate shadow-[0_0_8px_rgba(255,51,102,0.2)]"
        role="alert"
        title={error || "Save failed"}
      >
        <AlertCircle size={12} className="shrink-0" aria-hidden />
        {error || "Save failed"}
      </span>
    );
  }

  if (status === "saved") {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-300 border border-green-500/30 shadow-[0_0_8px_rgba(0,255,136,0.2)]"
        role="status"
        aria-live="polite"
        title={lastSavedAt ? `Saved ${new Date(lastSavedAt).toLocaleString()}` : undefined}
      >
        <Check size={12} aria-hidden />
        Saved{relativeSaved ? ` · ${relativeSaved}` : ""}
      </span>
    );
  }

  if (!hasPackagePath) {
    return (
      <span
        className="inline-flex shrink-0 items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400/90 border border-amber-500/20"
        title="Save to disk to enable auto-save"
      >
        <CloudOff size={12} aria-hidden />
        Unsaved
      </span>
    );
  }

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/20"
      role="status"
      title={lastSavedAt ? `Last saved ${new Date(lastSavedAt).toLocaleString()}` : undefined}
    >
      <Check size={12} aria-hidden />
      {relativeSaved ? `Saved ${relativeSaved}` : "Up to date"}
    </span>
  );
}
