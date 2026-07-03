"use client";

import { useMemo } from "react";
import type { Book } from "@/types/book";
import { getPreviewHtml, getPreviewMode } from "@/lib/preview";
import { resolveAssetUrl, resolveHtmlAssets } from "@/lib/asset-store";
import { useBookStore } from "@/store/book-store";

interface FullBookPreviewProps {
  book: Book;
}

export default function FullBookPreview({ book }: FullBookPreviewProps) {
  const { getAssetBlobs } = useBookStore();
  const blobs = getAssetBlobs(book.id);
  const mode = getPreviewMode(book);
  const isLandscape = book.layoutMode === "landscape";

  const coverSrc = book.metadata.coverImage
    ? resolveAssetUrl(book, book.metadata.coverImage, blobs)
    : null;

  const sections = useMemo(
    () =>
      [...book.chapters]
        .sort((a, b) => a.order - b.order)
        .map((chapter) => ({
          id: chapter.id,
          title: chapter.title,
          html: resolveHtmlAssets(book, getPreviewHtml(book, chapter.content, chapter.title), blobs),
        })),
    [book, blobs]
  );

  return (
    <div className="flex flex-col h-full rounded-xl border border-white/10 overflow-hidden bg-[#1a1a2e]">
      <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-[#121A2B]/80 shrink-0">
        <span className="text-xs text-slate-400">
          Full book preview · {sections.length} sections · {mode === "kbp" ? "KBP" : "Standard"}
        </span>
        <span className="text-xs text-slate-500">Read-only</span>
      </div>

      <div className="flex-1 overflow-y-auto p-6 md:p-10 flex flex-col items-center gap-8">
        {coverSrc && (
          <article
            className={`print-preview-page bg-white shadow-2xl ${
              isLandscape ? "w-full max-w-4xl" : "w-full max-w-[32rem]"
            }`}
          >
            <div className="relative aspect-[2/3] min-h-[400px]">
              <img src={coverSrc} alt="Cover" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent flex flex-col justify-end p-8 text-center">
                <h1 className="text-2xl font-bold text-white">{book.metadata.title}</h1>
                {book.metadata.subtitle && (
                  <p className="text-sm text-white/80 mt-1">{book.metadata.subtitle}</p>
                )}
                {book.metadata.author && (
                  <p className="text-sm text-white/70 mt-2 italic">by {book.metadata.author}</p>
                )}
              </div>
            </div>
          </article>
        )}

        {sections.map((section, idx) => (
          <article
            key={section.id}
            className={`print-preview-page bg-white shadow-2xl ${
              isLandscape ? "w-full max-w-4xl min-h-[480px]" : "w-full max-w-[32rem] min-h-[500px]"
            } ${mode === "kbp" ? "print-preview-kbp" : "print-preview-standard"}`}
          >
            {!coverSrc && idx === 0 && (
              <header className="print-preview-masthead">
                <p className="print-preview-publisher">{book.metadata.publisher || "OpenBook Author"}</p>
                <h2 className="print-preview-book-title">{book.metadata.title}</h2>
                {book.metadata.author && (
                  <p className="print-preview-author">by {book.metadata.author}</p>
                )}
              </header>
            )}
            <div className="print-preview-body" dangerouslySetInnerHTML={{ __html: section.html }} />
          </article>
        ))}
      </div>
    </div>
  );
}
