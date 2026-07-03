import { describe, expect, it } from "vitest";
import type { Book } from "@/types/book";
import { DEFAULT_KBP_SETTINGS, DEFAULT_EXPORT_THEME } from "@/types/book";
import {
  buildPreviewThemeCss,
  buildPrintBodyThemeCss,
  buildThemeTypographyCss,
  extractCustomCssAssetRefs,
  getBrokenCustomCssAssetRefs,
  getThemeStandardCss,
  normalizeExportTheme,
} from "@/lib/export-themes";
import { buildExportCss } from "@/lib/epub";

function baseBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "book-1",
    metadata: {
      title: "Test",
      subtitle: "",
      author: "Author",
      publisher: "",
      language: "en",
      description: "",
    },
    template: "portrait",
    layoutMode: "portrait",
    formatProfile: "standard",
    kbpSettings: DEFAULT_KBP_SETTINGS,
    chapters: [],
    assets: [{ id: "a1", filename: "logo.png", mimeType: "image/png", size: 1, createdAt: "" }],
    createdAt: "",
    updatedAt: "",
    ...overrides,
  };
}

describe("normalizeExportTheme", () => {
  it("defaults to classic-serif", () => {
    expect(normalizeExportTheme()).toEqual(DEFAULT_EXPORT_THEME);
    expect(normalizeExportTheme({ themeId: "invalid" as "minimal" })).toEqual(
      DEFAULT_EXPORT_THEME
    );
  });

  it("preserves valid theme and trims custom CSS", () => {
    expect(
      normalizeExportTheme({ themeId: "modern-sans", customCss: "  p { color: red; }  " })
    ).toEqual({
      themeId: "modern-sans",
      customCss: "p { color: red; }",
    });
  });
});

describe("buildThemeTypographyCss", () => {
  it("returns distinct CSS for each built-in theme", () => {
    const themes = ["classic-serif", "modern-sans", "textbook", "guidebook", "minimal"] as const;
    const cssSet = new Set(themes.map((id) => buildThemeTypographyCss(id, false)));
    expect(cssSet.size).toBe(5);
  });

  it("classic-serif uses Georgia", () => {
    expect(getThemeStandardCss("classic-serif")).toContain("Georgia");
  });

  it("modern-sans uses system sans-serif stack", () => {
    expect(getThemeStandardCss("modern-sans")).toContain("sans-serif");
  });

  it("guidebook theme uses trail green accent", () => {
    expect(getThemeStandardCss("guidebook")).toContain("#007a4d");
  });
});

describe("buildExportCss integration", () => {
  it("includes theme typography in standard export", () => {
    const css = buildExportCss(false, { themeId: "modern-sans" });
    expect(css).toContain("Segoe UI");
    expect(css).toContain("Interactive widgets");
  });

  it("appends custom CSS override", () => {
    const css = buildExportCss(false, {
      themeId: "minimal",
      customCss: ".author-note { font-style: italic; }",
    });
    expect(css).toContain("Custom export CSS");
    expect(css).toContain(".author-note { font-style: italic; }");
  });

  it("layers KBP overrides for kbp export", () => {
    const css = buildExportCss(true, { themeId: "guidebook" });
    expect(css).toContain("KBP — Kindle Book Publishing");
    expect(css).toContain("#007a4d");
  });
});

describe("custom CSS asset references", () => {
  it("extracts assets/ URLs from custom CSS", () => {
    expect(
      extractCustomCssAssetRefs(
        '.hero { background: url("assets/bg.jpg"); } .logo { background: url(assets/logo.png); }'
      )
    ).toEqual(["assets/bg.jpg", "assets/logo.png"]);
  });

  it("reports broken asset refs in publish readiness helper", () => {
    const book = baseBook({
      exportTheme: {
        themeId: "classic-serif",
        customCss: '.cover { background: url("assets/missing.png"); }',
      },
    });
    expect(getBrokenCustomCssAssetRefs(book)).toEqual(["assets/missing.png"]);
  });

  it("ignores refs that match book assets", () => {
    const book = baseBook({
      exportTheme: {
        themeId: "classic-serif",
        customCss: '.logo { background: url("assets/logo.png"); }',
      },
    });
    expect(getBrokenCustomCssAssetRefs(book)).toEqual([]);
  });
});

describe("preview and print theme CSS", () => {
  it("scopes preview CSS to export theme class", () => {
    const css = buildPreviewThemeCss(
      baseBook({ exportTheme: { themeId: "textbook" } })
    );
    expect(css).toContain(".export-theme-textbook .print-preview-body");
    expect(css).toContain("Palatino");
  });

  it("scopes print CSS to .print-body", () => {
    const css = buildPrintBodyThemeCss(
      baseBook({ exportTheme: { themeId: "minimal" } })
    );
    expect(css).toContain(".print-body");
    expect(css).toContain("Helvetica Neue");
  });
});
