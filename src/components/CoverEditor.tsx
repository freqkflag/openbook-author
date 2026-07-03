"use client";

import type { Book } from "@/types/book";
import { resolveAssetUrl } from "@/lib/asset-store";
import { useBookStore } from "@/store/book-store";

interface CoverEditorProps {
  book: Book;
}

export default function CoverEditor({ book }: CoverEditorProps) {
  const { getAssetBlobs } = useBookStore();
  const blobs = getAssetBlobs(book.id);
  const coverSrc = book.metadata.coverImage
    ? resolveAssetUrl(book, book.metadata.coverImage, blobs)
    : null;

  return (
    <div className="space-y-3 pt-3 border-t border-white/10">
      <h3 className="text-xs font-medium text-fuchsia-400 uppercase tracking-wider">Cover Page</h3>
      <p className="text-xs text-slate-500">
        Set a cover from the Assets panel, or upload directly there. The cover appears in preview and export.
      </p>
      <div className="relative aspect-[2/3] max-w-[180px] mx-auto rounded-lg overflow-hidden border border-white/10 bg-gradient-to-br from-[#121A2B] to-[#0B1020]">
        {coverSrc ? (
          <>
            <img src={coverSrc} alt="Book cover" className="absolute inset-0 w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent flex flex-col justify-end p-3 text-center">
              <p className="text-[10px] text-white/80 font-semibold leading-tight">{book.metadata.title}</p>
              {book.metadata.subtitle && (
                <p className="text-[8px] text-white/60 mt-0.5">{book.metadata.subtitle}</p>
              )}
              {book.metadata.author && (
                <p className="text-[8px] text-white/50 mt-1 italic">{book.metadata.author}</p>
              )}
            </div>
          </>
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 text-center">
            <p className="text-sm font-bold text-white leading-tight">{book.metadata.title || "Untitled"}</p>
            {book.metadata.subtitle && (
              <p className="text-[10px] text-slate-400 mt-1">{book.metadata.subtitle}</p>
            )}
            {book.metadata.author && (
              <p className="text-[10px] text-slate-500 mt-2 italic">by {book.metadata.author}</p>
            )}
            <p className="text-[9px] text-slate-600 mt-4">No cover image set</p>
          </div>
        )}
      </div>
    </div>
  );
}
