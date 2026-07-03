"use client";

import { useEffect } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  FileArchive,
  GitBranch,
  ImageOff,
  Layout,
  Puzzle,
  X,
} from "lucide-react";
import type { IBAImportDiagnostics } from "@/lib/iba-import";

interface ImportDiagnosticsModalProps {
  open: boolean;
  sourceLabel: string;
  bookTitle: string;
  diagnostics: IBAImportDiagnostics | null;
  onClose: () => void;
  onContinue: () => void;
}

function HierarchyTree({ entries, depth = 0 }: { entries: IBAImportDiagnostics["hierarchy"]; depth?: number }) {
  if (entries.length === 0) return null;

  return (
    <ul className={depth === 0 ? "space-y-1" : "ml-4 mt-1 space-y-1 border-l border-white/10 pl-3"}>
      {entries.map((entry, i) => (
        <li key={`${entry.title}-${depth}-${i}`} className="text-xs text-slate-300">
          <span className="text-slate-500 capitalize">{entry.nodeType}</span>
          {" · "}
          <span>{entry.title}</span>
          {entry.children.length > 0 && <HierarchyTree entries={entry.children} depth={depth + 1} />}
        </li>
      ))}
    </ul>
  );
}

export default function ImportDiagnosticsModal({
  open,
  sourceLabel,
  bookTitle,
  diagnostics,
  onClose,
  onContinue,
}: ImportDiagnosticsModalProps) {
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

  if (!open || !diagnostics) return null;

  const hasLost =
    diagnostics.lost.widgets.length > 0 ||
    diagnostics.lost.layout.length > 0 ||
    diagnostics.lost.media.length > 0 ||
    diagnostics.lost.unsupportedTags.length > 0;

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="import-diagnostics-title"
    >
      <div
        className="w-full max-w-lg max-h-[85vh] flex flex-col rounded-xl border border-purple-500/30 bg-[#121A2B] shadow-[0_0_24px_rgba(217,70,239,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-300">
            <FileArchive size={16} aria-hidden />
            <span id="import-diagnostics-title">{sourceLabel} import report</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Close import report"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4 overflow-y-auto flex-1">
          <p className="text-sm text-white font-medium">{bookTitle}</p>

          <section>
            <div className="flex items-center gap-2 text-xs font-medium text-green-400 mb-2">
              <CheckCircle2 size={14} aria-hidden />
              Imported
            </div>
            <ul className="text-xs text-slate-400 space-y-1">
              <li>
                {diagnostics.imported.chapters} chapter(s), {diagnostics.imported.images} image(s)
              </li>
              {diagnostics.imported.metadataFields.length > 0 && (
                <li>Metadata: {diagnostics.imported.metadataFields.join(", ")}</li>
              )}
            </ul>
          </section>

          {diagnostics.hierarchy.length > 0 && (
            <section>
              <div className="flex items-center gap-2 text-xs font-medium text-cyan-400 mb-2">
                <GitBranch size={14} aria-hidden />
                Chapter hierarchy
              </div>
              <HierarchyTree entries={diagnostics.hierarchy} />
            </section>
          )}

          {diagnostics.skipped.length > 0 && (
            <section>
              <div className="flex items-center gap-2 text-xs font-medium text-yellow-400 mb-2">
                <AlertTriangle size={14} aria-hidden />
                Skipped
              </div>
              <ul className="text-xs text-slate-400 space-y-1">
                {diagnostics.skipped.map((item, i) => (
                  <li key={i}>• {item}</li>
                ))}
              </ul>
            </section>
          )}

          {hasLost && (
            <section>
              <div className="flex items-center gap-2 text-xs font-medium text-amber-400 mb-2">
                <AlertTriangle size={14} aria-hidden />
                Not imported
              </div>
              <ul className="text-xs text-slate-400 space-y-1">
                {diagnostics.lost.widgets.map((item, i) => (
                  <li key={`w-${i}`} className="flex items-start gap-1.5">
                    <Puzzle size={12} className="shrink-0 mt-0.5 text-amber-500/70" aria-hidden />
                    {item}
                  </li>
                ))}
                {diagnostics.lost.layout.map((item, i) => (
                  <li key={`l-${i}`} className="flex items-start gap-1.5">
                    <Layout size={12} className="shrink-0 mt-0.5 text-amber-500/70" aria-hidden />
                    {item}
                  </li>
                ))}
                {diagnostics.lost.media.map((item, i) => (
                  <li key={`m-${i}`} className="flex items-start gap-1.5">
                    <ImageOff size={12} className="shrink-0 mt-0.5 text-amber-500/70" aria-hidden />
                    {item}
                  </li>
                ))}
                {diagnostics.lost.unsupportedTags.map((item, i) => (
                  <li key={`t-${i}`}>• Unsupported tag &quot;{item}&quot; → plain paragraph</li>
                ))}
              </ul>
            </section>
          )}
        </div>

        <div className="px-4 py-3 border-t border-white/10 flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-400 hover:text-white"
          >
            Stay on dashboard
          </button>
          <button
            type="button"
            onClick={onContinue}
            className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-500 to-cyan-500 text-white text-sm font-medium hover:from-purple-400 hover:to-cyan-400"
          >
            Open in editor
          </button>
        </div>
      </div>
    </div>
  );
}
