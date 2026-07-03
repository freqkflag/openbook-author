"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Book } from "@/types/book";
import {
  assessPublishReadiness,
  type PublishReadinessReport,
  type ReadinessIssue,
} from "@/lib/publish-readiness";
import { useBookStore } from "@/store/book-store";
import {
  epubValidationToReadinessIssues,
  getEpubCheckCliInstructions,
  validateBookEpubExport,
} from "@/lib/epub-validation";

interface PublishReadinessPanelProps {
  book: Book;
  onNavigateToChapter?: (chapterId: string) => void;
}

function IssueRow({
  severity,
  message,
  chapterId,
  onNavigateToChapter,
}: {
  severity: "error" | "warning";
  message: string;
  chapterId?: string;
  onNavigateToChapter?: (chapterId: string) => void;
}) {
  const Icon = severity === "error" ? AlertCircle : AlertTriangle;
  const colorClass = severity === "error" ? "text-red-300/90" : "text-amber-300/90";

  if (chapterId && onNavigateToChapter) {
    return (
      <li className={`flex items-start gap-1.5 text-xs ${colorClass}`}>
        <Icon size={12} className="shrink-0 mt-0.5" aria-hidden />
        <button
          type="button"
          onClick={() => onNavigateToChapter(chapterId)}
          className="text-left hover:underline focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/50 rounded"
        >
          {message}
        </button>
      </li>
    );
  }

  return (
    <li className={`flex items-start gap-1.5 text-xs ${colorClass}`}>
      <Icon size={12} className="shrink-0 mt-0.5" aria-hidden />
      <span>{message}</span>
    </li>
  );
}

function mergeReport(
  base: PublishReadinessReport,
  epubWarnings: ReadinessIssue[]
): PublishReadinessReport {
  if (epubWarnings.length === 0) return base;
  const issues = [...base.issues, ...epubWarnings];
  return {
    ...base,
    issues,
    warningCount: base.warningCount + epubWarnings.length,
  };
}

export default function PublishReadinessPanel({
  book,
  onNavigateToChapter,
}: PublishReadinessPanelProps) {
  const assetBlobs = useBookStore((s) => s.getAssetBlobs(book.id));
  const baseReport = useMemo(() => assessPublishReadiness(book), [book]);
  const [epubWarnings, setEpubWarnings] = useState<ReadinessIssue[]>([]);

  useEffect(() => {
    let cancelled = false;
    validateBookEpubExport(book, assetBlobs)
      .then((result) => {
        if (!cancelled) {
          setEpubWarnings(epubValidationToReadinessIssues(result));
        }
      })
      .catch(() => {
        if (!cancelled) setEpubWarnings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [book, assetBlobs]);

  const report = useMemo(
    () => mergeReport(baseReport, epubWarnings),
    [baseReport, epubWarnings]
  );

  const errors = report.issues.filter((i) => i.severity === "error");
  const warnings = report.issues.filter((i) => i.severity === "warning");
  const hasEpubWarnings = warnings.some((i) => i.id.startsWith("epub-"));

  return (
    <div className="pt-3 border-t border-white/10 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-medium text-green-400 uppercase tracking-wider">
          Publish Readiness
        </h3>
        {report.ready ? (
          <span className="inline-flex items-center gap-1 text-xs text-green-300">
            <CheckCircle2 size={12} aria-hidden />
            Ready
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 text-xs text-red-300">
            <AlertCircle size={12} aria-hidden />
            {report.errorCount} issue{report.errorCount === 1 ? "" : "s"}
          </span>
        )}
      </div>

      {report.issues.length === 0 ? (
        <p className="text-xs text-slate-500">All pre-flight checks passed.</p>
      ) : (
        <ul className="space-y-1.5 max-h-48 overflow-y-auto">
          {errors.map((item) => (
            <IssueRow
              key={item.id}
              severity="error"
              message={item.message}
              chapterId={item.chapterId}
              onNavigateToChapter={onNavigateToChapter}
            />
          ))}
          {warnings.map((item) => (
            <IssueRow
              key={item.id}
              severity="warning"
              message={item.message}
              chapterId={item.chapterId}
              onNavigateToChapter={onNavigateToChapter}
            />
          ))}
        </ul>
      )}

      {report.warningCount > 0 && report.ready && (
        <p className="text-xs text-slate-500">
          {report.warningCount} warning{report.warningCount === 1 ? "" : "s"} — export is
          allowed but review recommended.
        </p>
      )}

      {!hasEpubWarnings && report.ready && (
        <p className="text-xs text-slate-600" title={getEpubCheckCliInstructions()}>
          EPUB structure validated. For full store conformance, run W3C EPUBCheck after export.
        </p>
      )}
    </div>
  );
}
