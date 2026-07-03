"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Search, X, Replace, ReplaceAll } from "lucide-react";
import type { Chapter } from "@/types/book";
import { replaceInBook, searchBook } from "@/lib/book-search";

interface BookSearchModalProps {
  open: boolean;
  chapters: Chapter[];
  activeChapterId: string;
  onClose: () => void;
  onSelectChapter: (chapterId: string) => void;
  onApplyReplacements: (updates: { chapterId: string; content: string }[]) => void;
}

export default function BookSearchModal({
  open,
  chapters,
  activeChapterId,
  onClose,
  onSelectChapter,
  onApplyReplacements,
}: BookSearchModalProps) {
  const [query, setQuery] = useState("");
  const [replacement, setReplacement] = useState("");
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [wholeWord, setWholeWord] = useState(false);
  const [status, setStatus] = useState("");

  const handleClose = useCallback(() => {
    setStatus("");
    onClose();
  }, [onClose]);

  const results = useMemo(
    () => searchBook(chapters, query, { caseSensitive, wholeWord }),
    [chapters, query, caseSensitive, wholeWord]
  );

  const totalMatches = useMemo(
    () => results.reduce((sum, result) => sum + result.matchCount, 0),
    [results]
  );

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        handleClose();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, handleClose]);

  if (!open) return null;

  const handleReplace = (replaceAll: boolean) => {
    if (!query.trim()) {
      setStatus("Enter text to find.");
      return;
    }

    const { updates, totalReplacements } = replaceInBook(chapters, query, replacement, {
      caseSensitive,
      wholeWord,
      replaceAll,
    });

    if (totalReplacements === 0) {
      setStatus("No matches to replace.");
      return;
    }

    onApplyReplacements(updates);
    setStatus(
      replaceAll
        ? `Replaced ${totalReplacements} match${totalReplacements === 1 ? "" : "es"} across ${updates.length} section${updates.length === 1 ? "" : "s"}.`
        : `Replaced 1 match in ${updates.length} section${updates.length === 1 ? "" : "s"}.`
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="book-search-title"
    >
      <div
        className="w-full max-w-xl rounded-xl border border-cyan-500/30 bg-[#121A2B] shadow-[0_0_24px_rgba(0,229,255,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-cyan-300">
            <Search size={16} aria-hidden />
            <span id="book-search-title">Find &amp; replace across book</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Close search"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-3 space-y-3">
          <label className="block text-xs text-slate-400">
            Find
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search all sections..."
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>
          <label className="block text-xs text-slate-400">
            Replace with
            <input
              value={replacement}
              onChange={(e) => setReplacement(e.target.value)}
              placeholder="Replacement text"
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            />
          </label>

          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={caseSensitive}
                onChange={(e) => setCaseSensitive(e.target.checked)}
              />
              Case sensitive
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={wholeWord}
                onChange={(e) => setWholeWord(e.target.checked)}
              />
              Whole word
            </label>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => handleReplace(false)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30"
            >
              <Replace size={14} />
              Replace
            </button>
            <button
              type="button"
              onClick={() => handleReplace(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs bg-fuchsia-500/20 border border-fuchsia-500/30 text-fuchsia-300 hover:bg-fuchsia-500/30"
            >
              <ReplaceAll size={14} />
              Replace all
            </button>
          </div>

          {status && <p className="text-xs text-amber-300/90">{status}</p>}

          <div className="border-t border-white/10 pt-3">
            <p className="text-xs text-slate-500 mb-2">
              {query.trim()
                ? `${totalMatches} match${totalMatches === 1 ? "" : "es"} in ${results.length} section${results.length === 1 ? "" : "s"}`
                : "Enter a search term to see matches"}
            </p>
            <ul className="max-h-48 overflow-y-auto space-y-1">
              {results.map((result) => (
                <li key={result.chapterId}>
                  <button
                    type="button"
                    onClick={() => onSelectChapter(result.chapterId)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                      result.chapterId === activeChapterId
                        ? "bg-cyan-500/15 text-cyan-200"
                        : "text-slate-300 hover:bg-white/5"
                    }`}
                  >
                    <span className="font-medium">{result.chapterTitle}</span>
                    <span className="text-xs text-slate-500 ml-2">
                      {result.matchCount} match{result.matchCount === 1 ? "" : "es"}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
