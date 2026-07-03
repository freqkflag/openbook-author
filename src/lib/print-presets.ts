/** Print PDF trim presets — bleed/CMYK out of scope. */

export type PrintPresetId = "us-letter" | "trim-6x9" | "a5";

export interface PrintMargins {
  top: number;
  right: number;
  bottom: number;
  left: number;
}

export interface PrintPreset {
  id: PrintPresetId;
  label: string;
  description: string;
  /** CSS @page size value */
  pageSize: string;
  widthIn: number;
  heightIn: number;
  margins: PrintMargins;
  /** Electron printToPDF pageSize when preferCSSPageSize is false */
  electronPageSize: string | { width: number; height: number };
}

export interface PrintPdfOptions {
  presetId?: PrintPresetId;
  margins?: PrintMargins;
  showPageNumbers?: boolean;
  includeToc?: boolean;
}

export const PRINT_PRESETS: Record<PrintPresetId, PrintPreset> = {
  "us-letter": {
    id: "us-letter",
    label: "US Letter",
    description: "8.5 × 11 in — default US print",
    pageSize: "letter",
    widthIn: 8.5,
    heightIn: 11,
    margins: { top: 0.75, right: 0.75, bottom: 0.75, left: 0.75 },
    electronPageSize: "Letter",
  },
  "trim-6x9": {
    id: "trim-6x9",
    label: "6 × 9 in",
    description: "Trade paperback trim",
    pageSize: "6in 9in",
    widthIn: 6,
    heightIn: 9,
    margins: { top: 0.625, right: 0.625, bottom: 0.625, left: 0.75 },
    electronPageSize: { width: 152400, height: 228600 },
  },
  a5: {
    id: "a5",
    label: "A5",
    description: "148 × 210 mm — international trade",
    pageSize: "A5",
    widthIn: 5.83,
    heightIn: 8.27,
    margins: { top: 0.6, right: 0.6, bottom: 0.6, left: 0.7 },
    electronPageSize: "A5",
  },
};

export const DEFAULT_PRINT_PDF_OPTIONS: Required<PrintPdfOptions> = {
  presetId: "us-letter",
  margins: PRINT_PRESETS["us-letter"].margins,
  showPageNumbers: true,
  includeToc: true,
};

const INCH_TO_MICRON = 25400;

export function resolvePrintPreset(options: PrintPdfOptions = {}): {
  preset: PrintPreset;
  margins: PrintMargins;
  showPageNumbers: boolean;
  includeToc: boolean;
} {
  const presetId = options.presetId ?? DEFAULT_PRINT_PDF_OPTIONS.presetId;
  const preset = PRINT_PRESETS[presetId];
  return {
    preset,
    margins: options.margins ?? preset.margins,
    showPageNumbers: options.showPageNumbers ?? DEFAULT_PRINT_PDF_OPTIONS.showPageNumbers,
    includeToc: options.includeToc ?? DEFAULT_PRINT_PDF_OPTIONS.includeToc,
  };
}

/** CSS @page rule for trim size and margins */
export function buildPageRuleCss(preset: PrintPreset, margins: PrintMargins): string {
  return `@page {
  size: ${preset.pageSize};
  margin: ${margins.top}in ${margins.right}in ${margins.bottom}in ${margins.left}in;
}`;
}

/** Page-number and TOC leader styles for print HTML */
export function buildPrintPresetCss(
  preset: PrintPreset,
  margins: PrintMargins,
  showPageNumbers: boolean
): string {
  const pageRule = buildPageRuleCss(preset, margins);
  const contentHeight = preset.heightIn - margins.top - margins.bottom;

  const pageNumberCss = showPageNumbers
    ? `
body { counter-reset: print-page 0; }
.print-page { counter-increment: print-page; position: relative; }
.print-page .print-page-footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 9pt;
  color: #666;
  padding-top: 0.35em;
}
.print-page .print-page-footer::before { content: counter(print-page); }
.print-toc-page .print-page-footer::before { content: ""; }
.cover-page .print-page-footer::before { content: ""; }
`
    : "";

  return `${pageRule}
.cover-page {
  min-height: ${contentHeight}in;
}
${pageNumberCss}
.print-toc-page { padding: 0; }
.print-toc-title {
  font-size: 1.4em;
  font-weight: bold;
  text-align: center;
  margin: 0 0 1.25em;
}
.print-toc-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.print-toc-entry {
  display: flex;
  align-items: baseline;
  gap: 0.35em;
  margin: 0.45em 0;
  font-size: 10.5pt;
  line-height: 1.4;
}
.print-toc-title-text { flex-shrink: 0; max-width: 75%; }
.print-toc-leader {
  flex: 1;
  border-bottom: 1px dotted #bbb;
  min-width: 1.5em;
  margin-bottom: 0.2em;
}
.print-toc-page-num {
  flex-shrink: 0;
  min-width: 1.5em;
  text-align: right;
  font-variant-numeric: tabular-nums;
}
`;
}

export interface ElectronPrintPayload {
  preferCSSPageSize: boolean;
  printBackground: boolean;
  displayHeaderFooter: boolean;
  footerTemplate: string;
  marginsType: number;
  pageSize?: string | { width: number; height: number };
}

/** Map print options to Electron webContents.printToPDF settings */
export function toElectronPrintOptions(options: PrintPdfOptions = {}): ElectronPrintPayload {
  const { preset, margins, showPageNumbers } = resolvePrintPreset(options);
  return {
    preferCSSPageSize: true,
    printBackground: true,
    displayHeaderFooter: showPageNumbers,
    footerTemplate: showPageNumbers
      ? '<div style="font-size:9px;width:100%;text-align:center;color:#666;"><span class="pageNumber"></span></div>'
      : "<div></div>",
    marginsType: 1,
    pageSize: preset.electronPageSize,
  };
}

export function marginsToMicrons(margins: PrintMargins): {
  top: number;
  bottom: number;
  left: number;
  right: number;
} {
  return {
    top: Math.round(margins.top * INCH_TO_MICRON),
    bottom: Math.round(margins.bottom * INCH_TO_MICRON),
    left: Math.round(margins.left * INCH_TO_MICRON),
    right: Math.round(margins.right * INCH_TO_MICRON),
  };
}

export function listPrintPresets(): PrintPreset[] {
  return Object.values(PRINT_PRESETS);
}
