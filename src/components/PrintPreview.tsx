"use client";

import { useMemo } from "react";
import type { Book } from "@/types/book";
import { getPreviewHtml, getPreviewMode } from "@/lib/preview";

interface PrintPreviewProps {
  book: Book;
  chapterTitle: string;
  chapterContent: string;
}

export default function PrintPreview({ book, chapterTitle, chapterContent }: PrintPreviewProps) {
  const html = useMemo(
    () => getPreviewHtml(book, chapterContent, chapterTitle),
    [book, chapterContent, chapterTitle]
  );

  const mode = getPreviewMode(book);
  const isLandscape = book.layoutMode === "landscape";

  return (
    <div className="flex flex-col h-full rounded-xl border border-white/10 overflow-hidden bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#121A2B]/80 shrink-0">
        <span className="text-xs text-slate-400">
          Print preview · {mode === "kbp" ? "KBP" : "Standard"} ·{" "}
          {isLandscape ? "Landscape" : "Portrait"}
        </span>
        <span className="text-xs text-slate-500">Read-only</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 flex justify-center items-start">
        <article
          className={`print-preview-page bg-white shadow-2xl ${
            isLandscape ? "w-full max-w-4xl min-h-[480px]" : "w-full max-w-[32rem] min-h-[600px]"
          } ${mode === "kbp" ? "print-preview-kbp" : "print-preview-standard"}`}
        >
          <header className="print-preview-masthead">
            <p className="print-preview-publisher">
              {book.metadata.publisher || "OpenBook Author"}
            </p>
            <h2 className="print-preview-book-title">{book.metadata.title}</h2>
            {book.metadata.author && (
              <p className="print-preview-author">by {book.metadata.author}</p>
            )}
          </header>

          <div
            className="print-preview-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </article>
      </div>
    </div>
  );
}
