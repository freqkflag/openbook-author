"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, ChevronDown, ExternalLink } from "lucide-react";
import type { Book } from "@/types/book";
import {
  assessPublishReadiness,
  type PublishReadinessReport,
  type ReadinessIssue,
} from "@/lib/publish-readiness";
import { useBookStore } from "@/store/book-store";
import {
  epubValidationToReadinessIssues,
  getStoreValidatorInstructions,
  validateBookEpubExport,
  type EpubValidationResult,
} from "@/lib/epub-validation";

interface PublishReadinessPanelProps {
  book: Book;
  onNavigateToChapter?: (chapterId: string) => void;
}

type EpubValidationState =
  | { status: "idle" | "loading" }
  | { status: "done"; result: EpubValidationResult };

function detectValidatorPlatform(): "macos" | "electron" | "generic" {
  if (typeof navigator === "undefined") return "generic";
  const ua = navigator.userAgent;
  const isMac = /Mac/i.test(ua);
  const isElectron = /Electron/i.test(ua);
  if (isMac || isElectron) return isElectron ? "electron" : "macos";
  return "generic";
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
  epubWarnings: ReadinessIssue[],
  epubResult?: EpubValidationResult
): PublishReadinessReport {
  if (epubWarnings.length === 0 && !epubResult) return base;
  const issues = epubWarnings.length === 0 ? base.issues : [...base.issues, ...epubWarnings];
  return {
    ...base,
    issues,
    warningCount:
      epubWarnings.length === 0
        ? base.warningCount
        : base.warningCount + epubWarnings.length,
    epubValidation: epubResult,
  };
}

function EpubValidationSection({
  epubState,
  platform,
}: {
  epubState: EpubValidationState;
  platform: "macos" | "electron" | "generic";
}) {
  const instructions = useMemo(
    () => getStoreValidatorInstructions(platform),
    [platform]
  );

  if (epubState.status === "idle" || epubState.status === "loading") {
    return (
      <div className="rounded-lg border border-white/5 bg-white/[0.02] p-2 space-y-1">
        <p className="text-xs text-slate-500">
          {epubState.status === "loading"
            ? "Running post-export EPUB structural validation…"
            : "EPUB validation pending…"}
        </p>
      </div>
    );
  }

  const { result } = epubState;
  const hasIssues = result.issues.length > 0;
  const StatusIcon = hasIssues
    ? result.structurallyValid
      ? AlertTriangle
      : AlertCircle
    : CheckCircle2;
  const statusColor = hasIssues
    ? result.structurallyValid
      ? "text-amber-300"
      : "text-red-300"
    : "text-green-300";
  const statusLabel = hasIssues
    ? result.structurallyValid
      ? `${result.warningCount} structural warning${result.warningCount === 1 ? "" : "s"}`
      : `${result.errorCount} structural error${result.errorCount === 1 ? "" : "s"}`
    : "Structure OK";

  return (
    <div className="rounded-lg border border-cyan-500/10 bg-cyan-500/[0.03] p-2 space-y-2">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[10px] font-medium uppercase tracking-wider text-cyan-400/80">
          EPUB Structure
        </span>
        <span className={`inline-flex items-center gap-1 text-xs ${statusColor}`}>
          <StatusIcon size={12} aria-hidden />
          {statusLabel}
        </span>
      </div>

      {result.epubCheckRecommended && (
        <p className="text-xs text-slate-500">
          Built-in checks passed — run EPUBCheck for full W3C conformance before store upload.
        </p>
      )}

      <details className="group text-xs">
        <summary className="flex cursor-pointer list-none items-center gap-1 text-slate-400 hover:text-slate-300 focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-500/50 rounded">
          <ChevronDown
            size={12}
            className="shrink-0 transition-transform group-open:rotate-180"
            aria-hidden
          />
          <span>EPUBCheck &amp; Kindle Previewer steps</span>
          <ExternalLink size={10} className="opacity-50" aria-hidden />
        </summary>
        <div className="mt-2 space-y-2 pl-4 border-l border-white/5">
          <div>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">
              EPUBCheck
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-slate-500">
              {instructions.epubCheck.slice(1).map((line) => (
                <li key={line} className="leading-relaxed">
                  {line.replace(/^\s*\d+\.\s*/, "")}
                </li>
              ))}
            </ol>
          </div>
          <div>
            <p className="text-[10px] font-medium text-slate-500 uppercase tracking-wide mb-1">
              Kindle Previewer
            </p>
            <ol className="list-decimal list-inside space-y-0.5 text-slate-500">
              {instructions.kindlePreviewer.slice(1).map((line) => (
                <li key={line} className="leading-relaxed">
                  {line.replace(/^\s*\d+\.\s*/, "")}
                </li>
              ))}
            </ol>
          </div>
          {platform === "electron" && (
            <p className="text-slate-600 italic">
              Desktop app: export EPUB, then open the saved file in the tools above.
            </p>
          )}
        </div>
      </details>
    </div>
  );
}

export default function PublishReadinessPanel({
  book,
  onNavigateToChapter,
}: PublishReadinessPanelProps) {
  const assetBlobs = useBookStore((s) => s.getAssetBlobs(book.id));
  const baseReport = useMemo(() => assessPublishReadiness(book), [book]);
  const [epubState, setEpubState] = useState<EpubValidationState>({ status: "loading" });
  const platform = useMemo(() => detectValidatorPlatform(), []);

  useEffect(() => {
    let cancelled = false;
    setEpubState({ status: "loading" });
    validateBookEpubExport(book, assetBlobs)
      .then((result) => {
        if (!cancelled) setEpubState({ status: "done", result });
      })
      .catch(() => {
        if (!cancelled) {
          setEpubState({
            status: "done",
            result: {
              issues: [
                {
                  id: "epub-validation-failed",
                  severity: "error",
                  message: "Could not run EPUB structural validation",
                  action: "Try again or export manually and run EPUBCheck",
                },
              ],
              errorCount: 1,
              warningCount: 0,
              structurallyValid: false,
              epubCheckRecommended: false,
            },
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, [book, assetBlobs]);

  const epubWarnings =
    epubState.status === "done"
      ? epubValidationToReadinessIssues(epubState.result)
      : [];
  const epubResult = epubState.status === "done" ? epubState.result : undefined;

  const report = useMemo(
    () => mergeReport(baseReport, epubWarnings, epubResult),
    [baseReport, epubWarnings, epubResult]
  );

  const errors = report.issues.filter((i) => i.severity === "error");
  const warnings = report.issues.filter((i) => i.severity === "warning");
  const nonEpubWarnings = warnings.filter((i) => !i.id.startsWith("epub-"));
  const epubWarningsOnly = warnings.filter((i) => i.id.startsWith("epub-"));

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

      <EpubValidationSection epubState={epubState} platform={platform} />

      {errors.length === 0 && nonEpubWarnings.length === 0 && epubWarningsOnly.length === 0 ? (
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
          {nonEpubWarnings.map((item) => (
            <IssueRow
              key={item.id}
              severity="warning"
              message={item.message}
              chapterId={item.chapterId}
              onNavigateToChapter={onNavigateToChapter}
            />
          ))}
          {epubWarningsOnly.map((item) => (
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
    </div>
  );
}
