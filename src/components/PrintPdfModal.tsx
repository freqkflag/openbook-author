"use client";

import { useCallback, useEffect, useState } from "react";
import { FileDown, X } from "lucide-react";
import {
  DEFAULT_PRINT_PDF_OPTIONS,
  type PrintPdfOptions,
  type PrintPresetId,
  listPrintPresets,
} from "@/lib/print-presets";

interface PrintPdfModalProps {
  open: boolean;
  onClose: () => void;
  onExport: (options: PrintPdfOptions) => void;
}

export default function PrintPdfModal({ open, onClose, onExport }: PrintPdfModalProps) {
  const [presetId, setPresetId] = useState<PrintPresetId>(DEFAULT_PRINT_PDF_OPTIONS.presetId);
  const [showPageNumbers, setShowPageNumbers] = useState(DEFAULT_PRINT_PDF_OPTIONS.showPageNumbers);
  const [includeToc, setIncludeToc] = useState(DEFAULT_PRINT_PDF_OPTIONS.includeToc);
  const [marginPreset, setMarginPreset] = useState<"default" | "narrow" | "wide">("default");

  const handleClose = useCallback(() => {
    onClose();
  }, [onClose]);

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

  const presets = listPrintPresets();
  const selectedPreset = presets.find((p) => p.id === presetId) ?? presets[0];

  const scaleMargins = (factor: number) => ({
    top: Math.round(selectedPreset.margins.top * factor * 1000) / 1000,
    right: Math.round(selectedPreset.margins.right * factor * 1000) / 1000,
    bottom: Math.round(selectedPreset.margins.bottom * factor * 1000) / 1000,
    left: Math.round(selectedPreset.margins.left * factor * 1000) / 1000,
  });

  const margins =
    marginPreset === "narrow"
      ? scaleMargins(0.75)
      : marginPreset === "wide"
        ? scaleMargins(1.25)
        : undefined;

  const handleExport = () => {
    onExport({
      presetId,
      margins,
      showPageNumbers,
      includeToc,
    });
    handleClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/60 backdrop-blur-sm"
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="print-pdf-title"
    >
      <div
        className="w-full max-w-md rounded-xl border border-purple-500/30 bg-[#121A2B] shadow-[0_0_24px_rgba(217,70,239,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
          <div className="flex items-center gap-2 text-sm font-medium text-purple-300">
            <FileDown size={16} aria-hidden />
            <span id="print-pdf-title">Export PDF</span>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5"
            aria-label="Close PDF export"
          >
            <X size={16} />
          </button>
        </div>

        <div className="px-4 py-4 space-y-4">
          <label className="block text-xs text-slate-400">
            Trim size
            <select
              value={presetId}
              onChange={(e) => setPresetId(e.target.value as PrintPresetId)}
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              {presets.map((preset) => (
                <option key={preset.id} value={preset.id}>
                  {preset.label} — {preset.description}
                </option>
              ))}
            </select>
          </label>

          <label className="block text-xs text-slate-400">
            Margins
            <select
              value={marginPreset}
              onChange={(e) => setMarginPreset(e.target.value as "default" | "narrow" | "wide")}
              className="mt-1 w-full bg-[#0B1020] border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
            >
              <option value="default">Default for {selectedPreset.label}</option>
              <option value="narrow">Narrow (75%)</option>
              <option value="wide">Wide (125%)</option>
            </select>
          </label>

          <div className="space-y-2 text-xs text-slate-400">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPageNumbers}
                onChange={(e) => setShowPageNumbers(e.target.checked)}
                className="rounded border-white/20 bg-[#0B1020] text-purple-500 focus:ring-purple-500/40"
              />
              Show page numbers
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={includeToc}
                onChange={(e) => setIncludeToc(e.target.checked)}
                className="rounded border-white/20 bg-[#0B1020] text-purple-500 focus:ring-purple-500/40"
              />
              Include table of contents with dot leaders
            </label>
          </div>

          <p className="text-xs text-slate-500">
            Bleed and CMYK are not included — trim size and margins only. Electron uses native
            save; web opens the browser print dialog.
          </p>
        </div>

        <div className="flex justify-end gap-2 px-4 py-3 border-t border-white/10">
          <button
            type="button"
            onClick={handleClose}
            className="px-3 py-1.5 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleExport}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-purple-500/20 border border-purple-500/40 text-purple-200 hover:bg-purple-500/30"
          >
            Export PDF
          </button>
        </div>
      </div>
    </div>
  );
}
