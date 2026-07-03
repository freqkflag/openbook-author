"use client";

import { useMemo } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { Book } from "@/types/book";
import { assessPublishReadiness } from "@/lib/publish-readiness";

interface PublishReadinessPanelProps {
  book: Book;
}

export default function PublishReadinessPanel({ book }: PublishReadinessPanelProps) {
  const report = useMemo(() => assessPublishReadiness(book), [book]);

  const errors = report.issues.filter((i) => i.severity === "error");
  const warnings = report.issues.filter((i) => i.severity === "warning");

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
            <li
              key={item.id}
              className="flex items-start gap-1.5 text-xs text-red-300/90"
            >
              <AlertCircle size={12} className="shrink-0 mt-0.5" aria-hidden />
              <span>{item.message}</span>
            </li>
          ))}
          {warnings.map((item) => (
            <li
              key={item.id}
              className="flex items-start gap-1.5 text-xs text-amber-300/90"
            >
              <AlertTriangle size={12} className="shrink-0 mt-0.5" aria-hidden />
              <span>{item.message}</span>
            </li>
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
