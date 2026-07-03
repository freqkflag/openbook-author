"use client";

import { useRef, useState } from "react";
import { Image, Trash2, Upload, X, Plus } from "lucide-react";
import type { Book, BookAsset } from "@/types/book";
import { resolveAssetUrl } from "@/lib/asset-store";
import { useBookStore } from "@/store/book-store";

interface AssetPanelProps {
  book: Book;
  onClose: () => void;
  onInsert?: (src: string, alt?: string) => void;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AssetPanel({ book, onClose, onInsert }: AssetPanelProps) {
  const { addAsset, removeAsset, updateAsset, setCoverImage, getAssetBlobs } = useBookStore();
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const blobs = getAssetBlobs(book.id);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError("");
    for (let i = 0; i < files.length; i++) {
      await addAsset(book.id, files[i]);
    }
  };

  const handleDelete = (asset: BookAsset) => {
    const ok = removeAsset(book.id, asset.id);
    if (!ok) setError(`"${asset.filename}" is used in the book and cannot be deleted.`);
    else setError("");
  };

  return (
    <div className="flex flex-col h-full bg-[#121A2B]/90 backdrop-blur-xl border-l border-cyan-500/20">
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <Image size={18} className="text-cyan-400" />
          <h2 className="font-semibold text-sm text-white">Assets</h2>
        </div>
        <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-white hover:bg-white/5">
          <X size={16} />
        </button>
      </div>

      <div className="p-3">
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            dragging
              ? "border-cyan-400 bg-cyan-500/10"
              : "border-white/15 hover:border-cyan-500/40 hover:bg-white/5"
          }`}
        >
          <Upload size={24} className="mx-auto text-cyan-400 mb-2" />
          <p className="text-sm text-slate-300">Drop images here or click to upload</p>
          <p className="text-xs text-slate-500 mt-1">PNG, JPG, GIF, WebP</p>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
      </div>

      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2">
        {book.assets.length === 0 ? (
          <p className="text-xs text-slate-500 text-center py-6">No assets yet</p>
        ) : (
          book.assets.map((asset) => {
            const src = resolveAssetUrl(book, `assets/${asset.filename}`, blobs);
            const isCover = book.metadata.coverImage === `assets/${asset.filename}`;
            return (
              <div
                key={asset.id}
                className="rounded-lg border border-white/10 bg-[#0B1020]/60 overflow-hidden"
              >
                <div className="aspect-video bg-black/20 flex items-center justify-center overflow-hidden">
                  {asset.mimeType.startsWith("image/") ? (
                    <img src={src} alt={asset.alt || asset.filename} className="max-h-full max-w-full object-contain" />
                  ) : (
                    <Image size={32} className="text-slate-600" />
                  )}
                </div>
                <div className="p-2 space-y-1">
                  <p className="text-xs text-white truncate" title={asset.filename}>{asset.filename}</p>
                  <p className="text-[10px] text-slate-500">{formatSize(asset.size)}{isCover ? " · Cover" : ""}</p>
                  <input
                    type="text"
                    value={asset.alt || ""}
                    onChange={(e) => updateAsset(book.id, asset.id, { alt: e.target.value })}
                    placeholder="Alt text"
                    className="w-full bg-[#121A2B] border border-white/10 rounded px-2 py-1 text-[10px] text-slate-300"
                  />
                  <div className="flex gap-1 pt-1">
                    {onInsert && (
                      <button
                        onClick={() => onInsert(`assets/${asset.filename}`, asset.alt)}
                        className="flex-1 flex items-center justify-center gap-1 py-1 rounded text-[10px] bg-cyan-500/20 text-cyan-300 hover:bg-cyan-500/30"
                      >
                        <Plus size={10} /> Insert
                      </button>
                    )}
                    <button
                      onClick={() => setCoverImage(book.id, asset.id)}
                      className={`flex-1 py-1 rounded text-[10px] ${
                        isCover
                          ? "bg-fuchsia-500/30 text-fuchsia-300"
                          : "bg-white/5 text-slate-400 hover:text-white"
                      }`}
                    >
                      Cover
                    </button>
                    <button
                      onClick={() => handleDelete(asset)}
                      className="p-1 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
