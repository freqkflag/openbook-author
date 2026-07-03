import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyKbpToHtml,
  isKbpEnabled,
  kbpManifest,
} from "@/lib/kbp";
import type { Book, KBPSettings } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";

function createKbpSettings(overrides: Partial<KBPSettings> = {}): KBPSettings {
  return {
    ...DEFAULT_KBP_SETTINGS,
    enabled: true,
    ...overrides,
  };
}

function createBook(overrides: Partial<Book> = {}): Book {
  return {
    id: "kbp-test-book",
    metadata: {
      title: "KBP Test Book",
      subtitle: "",
      author: "Test Author",
      publisher: "",
      language: "en",
      description: "",
    },
    template: "portrait",
    layoutMode: "portrait",
    formatProfile: "standard",
    kbpSettings: createKbpSettings({ enabled: false }),
    chapters: [],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("applyKbpToHtml", () => {
  it("combines first-line indent and drop-cap paragraph classes", () => {
    const html = "<h1>Opening</h1><p>First paragraph.</p><p>Second paragraph.</p>";
    const result = applyKbpToHtml(
      html,
      createKbpSettings({ firstLineIndent: true, dropCaps: true })
    );

    expect(result).toContain('<p class="kbp-body drop-cap">First paragraph.</p>');
    expect(result).toContain('<p class="kbp-body">Second paragraph.</p>');
    expect(result).not.toContain('class="drop-cap" class="kbp-body"');
  });

  it("keeps existing paragraph attributes when adding body classes", () => {
    const html = '<p id="intro" class="no-indent">Intro paragraph.</p>';
    const result = applyKbpToHtml(
      html,
      createKbpSettings({ firstLineIndent: true, dropCaps: false })
    );

    expect(result).toBe(
      '<p id="intro" class="no-indent kbp-body">Intro paragraph.</p>'
    );
  });

  it("converts tip, warning, and numbered step callouts", () => {
    const html = [
      '<div data-callout="tip" data-text="Bring water."></div>',
      '<div data-callout="warning" data-text="Storms move fast."></div>',
      '<div data-callout="step" data-number="2" data-text="Check the map."></div>',
    ].join("");

    expect(applyKbpToHtml(html, createKbpSettings())).toBe(
      '<div class="kbp-tip">Bring water.</div>' +
        '<div class="kbp-warning">Storms move fast.</div>' +
        '<div class="kbp-step"><span class="step-number">2</span>Check the map.</div>'
    );
  });

  it.each([
    ["asterisks", '<p class="scene-break">* * *</p>'],
    ["line", '<p class="scene-break line"></p>'],
    ["ornament", '<p class="scene-break ornament"></p>'],
  ] as const)("renders %s scene breaks", (sceneBreakStyle, expected) => {
    const html = '<hr data-kbp="scene-break" />';
    expect(applyKbpToHtml(html, createKbpSettings({ sceneBreakStyle }))).toBe(
      expected
    );
  });
});

describe("isKbpEnabled", () => {
  it("is enabled by either the book format profile or explicit settings", () => {
    expect(isKbpEnabled(createBook({ formatProfile: "kbp" }))).toBe(true);
    expect(
      isKbpEnabled(
        createBook({ kbpSettings: createKbpSettings({ enabled: true }) })
      )
    ).toBe(true);
  });

  it("is disabled for standard books without explicit KBP settings", () => {
    expect(isKbpEnabled(createBook())).toBe(false);
  });
});

describe("kbpManifest", () => {
  it("emits stable book metadata and export notes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T03:04:05.000Z"));

    const manifest = kbpManifest(
      createBook({
        formatProfile: "kbp",
        kbpSettings: createKbpSettings({ dropCaps: true }),
        chapters: [
          { id: "chapter-1", title: "One", content: "<p>One</p>", order: 0 },
          { id: "chapter-2", title: "Two", content: "<p>Two</p>", order: 1 },
        ],
      })
    );

    expect(manifest).toEqual({
      format: "kbp",
      version: "1.0",
      generator: "OpenBook Author",
      title: "KBP Test Book",
      author: "Test Author",
      language: "en",
      chapterCount: 2,
      settings: createKbpSettings({ dropCaps: true }),
      exportedAt: "2026-01-02T03:04:05.000Z",
      kdpNotes: [
        "Upload the included .epub file to Kindle Direct Publishing",
        "Or import chapters into Kindle Create from the HTML folder",
        "Chapter titles use H1 for automatic TOC generation",
      ],
    });
  });
});
