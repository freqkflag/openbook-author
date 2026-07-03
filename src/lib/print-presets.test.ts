import { describe, expect, it } from "vitest";
import { buildPrintDocument, computeChapterStartPages } from "@/lib/pdf-export";
import {
  PRINT_PRESETS,
  buildPageRuleCss,
  buildPrintPresetCss,
  resolvePrintPreset,
  toElectronPrintOptions,
} from "@/lib/print-presets";
import type { Book } from "@/types/book";

function baseBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-preset",
    metadata: {
      title: "Preset Book",
      subtitle: "",
      author: "Author",
      publisher: "Press",
      language: "en",
      description: "",
      coverImage: undefined,
    },
    template: "guidebook",
    layoutMode: "portrait",
    formatProfile: "standard",
    kbpSettings: {
      enabled: false,
      firstLineIndent: true,
      dropCaps: false,
      sceneBreakStyle: "asterisks",
      chapterNumbering: true,
    },
    chapters: [
      { id: "ch-1", title: "Intro", content: "<p>One</p>", order: 0 },
      { id: "ch-2", title: "Body", content: "<p>Two</p>", order: 1 },
    ],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("print presets", () => {
  it("defines US Letter, 6×9, and A5 presets", () => {
    expect(Object.keys(PRINT_PRESETS)).toEqual(["us-letter", "trim-6x9", "a5"]);
    expect(PRINT_PRESETS["trim-6x9"].pageSize).toBe("6in 9in");
    expect(PRINT_PRESETS.a5.pageSize).toBe("A5");
  });

  it("builds @page CSS with trim size and margins", () => {
    const css = buildPageRuleCss(PRINT_PRESETS["trim-6x9"], PRINT_PRESETS["trim-6x9"].margins);
    expect(css).toContain("size: 6in 9in");
    expect(css).toContain("margin: 0.625in 0.625in 0.625in 0.75in");
  });

  it("includes TOC leader styles in preset CSS", () => {
    const css = buildPrintPresetCss(
      PRINT_PRESETS["us-letter"],
      PRINT_PRESETS["us-letter"].margins,
      false
    );
    expect(css).toContain(".print-toc-leader");
    expect(css).toContain("border-bottom: 1px dotted");
  });

  it("includes page number counter CSS when enabled", () => {
    const css = buildPrintPresetCss(
      PRINT_PRESETS["us-letter"],
      PRINT_PRESETS["us-letter"].margins,
      true
    );
    expect(css).toContain("counter-increment: print-page");
    expect(css).toContain(".print-page-footer");
  });

  it("maps options to Electron printToPDF with CSS page size", () => {
    const opts = toElectronPrintOptions({ presetId: "trim-6x9", showPageNumbers: true });
    expect(opts.preferCSSPageSize).toBe(true);
    expect(opts.displayHeaderFooter).toBe(true);
    expect(opts.marginsType).toBe(1);
    expect(opts.pageSize).toEqual({ width: 152400, height: 228600 });
  });
});

describe("buildPrintDocument presets", () => {
  it("embeds trim-6x9 @page size in document CSS", () => {
    const html = buildPrintDocument(baseBook(), undefined, { presetId: "trim-6x9" });
    expect(html).toContain("size: 6in 9in");
  });

  it("embeds A5 @page size when selected", () => {
    const html = buildPrintDocument(baseBook(), undefined, { presetId: "a5" });
    expect(html).toContain("size: A5");
  });

  it("includes TOC page with dot leaders and page numbers", () => {
    const html = buildPrintDocument(baseBook(), undefined, { includeToc: true });
    expect(html).toContain("print-toc-page");
    expect(html).toContain('class="print-toc-leader"');
    expect(html).toContain("Intro");
    expect(html).toContain("Body");
    expect(html).toContain('class="print-toc-page-num">2</span>');
    expect(html).toContain('class="print-toc-page-num">3</span>');
  });

  it("offsets TOC page numbers when cover is present", () => {
    const html = buildPrintDocument(
      baseBook({ metadata: { ...baseBook().metadata, coverImage: "assets/cover.jpg" } }),
      undefined,
      { includeToc: true }
    );
    expect(html).toContain('class="print-toc-page-num">3</span>');
    expect(html).toContain('class="print-toc-page-num">4</span>');
  });

  it("omits TOC when includeToc is false", () => {
    const html = buildPrintDocument(baseBook(), undefined, { includeToc: false });
    const body = html.match(/<body>([\s\S]*)<\/body>/)?.[1] ?? html;
    expect(body).not.toMatch(/<section class="print-page print-toc-page"/);
  });

  it("adds page footer markup when showPageNumbers is true", () => {
    const html = buildPrintDocument(baseBook(), undefined, { showPageNumbers: true });
    expect(html).toContain('class="print-page-footer"');
  });

  it("computes chapter start pages accounting for cover and TOC", () => {
    const book = baseBook({
      metadata: { ...baseBook().metadata, coverImage: "assets/cover.jpg" },
    });
    const starts = computeChapterStartPages(book, { includeToc: true });
    expect(starts.get("ch-1")).toBe(3);
    expect(starts.get("ch-2")).toBe(4);
  });
});

describe("resolvePrintPreset", () => {
  it("falls back to US Letter defaults", () => {
    const resolved = resolvePrintPreset({});
    expect(resolved.preset.id).toBe("us-letter");
    expect(resolved.showPageNumbers).toBe(true);
    expect(resolved.includeToc).toBe(true);
  });
});
