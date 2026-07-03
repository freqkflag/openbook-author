"use client";

import { useRef } from "react";
import { Upload } from "lucide-react";
import type { Book } from "@/types/book";
import { resolveAssetUrl } from "@/lib/asset-store";
import { useBookStore } from "@/store/book-store";

interface CoverEditorProps {
  book: Book;
}

export default function CoverEditor({ book }: CoverEditorProps) {
  const { getAssetBlobs, addAsset, setCoverImage } = useBookStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const blobs = getAssetBlobs(book.id);
  const coverSrc = book.metadata.coverImage
    ? resolveAssetUrl(book, book.metadata.coverImage, blobs)
    : null;

  const handleUpload = async (file: File) => {
    const asset = await addAsset(book.id, file);
    setCoverImage(book.id, asset.id);
  };

  return (
    <div className="space-y-3 pt-3 border-t border-white/10">
      <h3 className="text-xs font-medium text-fuchsia-400 uppercase tracking-wider">Cover Page</h3>
      <p className="text-xs text-slate-500">
        Upload a cover here or pick one from the Assets panel. The cover appears in preview and export.
      </p>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleUpload(file);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        className="flex items-center gap-2 w-full justify-center px-3 py-2 rounded-lg border border-fuchsia-500/30 text-fuchsia-300 text-xs hover:bg-fuchsia-500/10 transition-colors"
      >
        <Upload size={14} />
        Upload cover image
      </button>
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
