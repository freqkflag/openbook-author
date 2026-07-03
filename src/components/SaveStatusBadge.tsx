"use client";

import { Check, AlertCircle, Loader2, CloudOff } from "lucide-react";

interface SaveStatusBadgeProps {
  status: "idle" | "saving" | "saved" | "error";
  error?: string | null;
  hasPackagePath?: boolean;
}

export default function SaveStatusBadge({
  status,
  error,
  hasPackagePath,
}: SaveStatusBadgeProps) {
  if (status === "saving") {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-300 border border-amber-500/30"
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
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/15 text-red-300 border border-red-500/30 max-w-[200px] truncate"
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
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/15 text-green-300 border border-green-500/30"
        role="status"
        aria-live="polite"
      >
        <Check size={12} aria-hidden />
        Saved
      </span>
    );
  }

  if (!hasPackagePath) {
    return (
      <span
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400/90 border border-amber-500/20"
        title="Save to disk to enable auto-save"
      >
        <CloudOff size={12} aria-hidden />
        Unsaved
      </span>
    );
  }

  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400/80 border border-cyan-500/20"
      role="status"
    >
      <Check size={12} aria-hidden />
      Up to date
    </span>
  );
}
