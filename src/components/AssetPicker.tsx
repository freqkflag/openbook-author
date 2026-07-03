"use client";

import { useRef } from "react";
import { Upload, X } from "lucide-react";
import type { Book } from "@/types/book";
import { resolveAssetUrl } from "@/lib/asset-store";
import { useBookStore } from "@/store/book-store";

interface AssetPickerProps {
  book: Book;
  open: boolean;
  onClose: () => void;
  onSelect: (src: string, alt?: string) => void;
  title?: string;
}

export default function AssetPicker({ book, open, onClose, onSelect, title = "Choose Image" }: AssetPickerProps) {
  const { addAsset, getAssetBlobs } = useBookStore();
  const inputRef = useRef<HTMLInputElement>(null);
  const blobs = getAssetBlobs(book.id);

  if (!open) return null;

  const handleUpload = async (files: FileList | null) => {
    if (!files?.[0]) return;
    const asset = await addAsset(book.id, files[0]);
    onSelect(`assets/${asset.filename}`, asset.alt);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#121A2B] shadow-2xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <div className="p-4">
          <button
            onClick={() => inputRef.current?.click()}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl border border-dashed border-white/20 text-sm text-slate-400 hover:border-cyan-500/40 hover:text-cyan-300 mb-4"
          >
            <Upload size={16} /> Upload new image
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => handleUpload(e.target.files)}
          />

          {book.assets.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">No assets in this book yet</p>
          ) : (
            <div className="grid grid-cols-3 gap-2 max-h-64 overflow-y-auto">
              {book.assets
                .filter((a) => a.mimeType.startsWith("image/"))
                .map((asset) => (
                  <button
                    key={asset.id}
                    onClick={() => {
                      onSelect(`assets/${asset.filename}`, asset.alt);
                      onClose();
                    }}
                    className="aspect-square rounded-lg border border-white/10 overflow-hidden hover:border-cyan-500/50 transition-all"
                  >
                    <img
                      src={resolveAssetUrl(book, `assets/${asset.filename}`, blobs)}
                      alt={asset.alt || asset.filename}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
