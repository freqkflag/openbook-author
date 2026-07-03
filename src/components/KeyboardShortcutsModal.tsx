"use client";

import { useEffect } from "react";
import { X, Keyboard } from "lucide-react";
import {
  APP_SHORTCUTS,
  FORMATTING_SHORTCUTS,
  type ShortcutEntry,
} from "@/lib/keyboard-shortcuts";

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

function ShortcutGroup({ title, entries }: { title: string; entries: ShortcutEntry[] }) {
  return (
    <div className="mb-4 last:mb-0">
      <h3 className="text-xs font-medium uppercase tracking-wide text-slate-500 mb-2">{title}</h3>
      <ul className="space-y-1.5">
        {entries.map((entry) => (
          <li
            key={`${title}-${entry.keys}`}
            className="flex items-center justify-between gap-4 py-1.5 text-sm border-b border-white/5 last:border-0"
          >
            <span className="text-slate-300">{entry.description}</span>
            <kbd className="shrink-0 px-2 py-0.5 rounded-md bg-[#0B1020] border border-white/10 text-xs font-mono text-cyan-400/90">
              {entry.keys}
            </kbd>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="shortcuts-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-cyan-500/30 bg-[#121A2B] shadow-[0_0_24px_rgba(0,229,255,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
            <Keyboard size={16} aria-hidden />
            <span id="shortcuts-title">Keyboard shortcuts</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Close shortcuts"
          >
            <X size={16} />
          </button>
        </div>
        <div className="px-4 py-3 max-h-[60vh] overflow-y-auto">
          <ShortcutGroup title="Book & navigation" entries={APP_SHORTCUTS} />
          <ShortcutGroup title="Formatting" entries={FORMATTING_SHORTCUTS} />
        </div>
      </div>
    </div>
  );
}
