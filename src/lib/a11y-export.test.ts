/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import axe from "axe-core";
import { prepareChapterContent, transformWidgetsForEpub } from "@/lib/epub";
import {
  serializeGuidebookBlockToHtml,
  seedTrailStopPayload,
  seedWorkshopPayload,
  seedCheatSheetPayload,
  buildGettingStartedChapterContent,
} from "@/lib/guidebook-seed";
import type { Book } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";

/** Rules that need real layout/computed styles and are unreliable in jsdom. */
const JSDOM_DISABLED_RULES = ["color-contrast", "link-in-text-block"] as const;

function createGuidebookMockBook(): Book {
  return {
    id: "a11y-guidebook",
    metadata: {
      title: "A11y Guidebook",
      subtitle: "",
      author: "Test Author",
      publisher: "",
      language: "en",
      description: "",
    },
    template: "guidebook",
    layoutMode: "portrait",
    formatProfile: "kbp",
    kbpSettings: { ...DEFAULT_KBP_SETTINGS, enabled: true },
    chapters: [],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

function wrapExportChapterHtml(bodyHtml: string, title = "Chapter"): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8"/>
  <title>${title}</title>
</head>
<body>
  <main>${bodyHtml}</main>
</body>
</html>`;
}

function loadExportDocument(html: string): void {
  document.open();
  document.write(html);
  document.close();
}

async function runAxeOnExportHtml(html: string): Promise<axe.AxeResults> {
  loadExportDocument(html);
  return axe.run(document, {
    rules: Object.fromEntries(
      JSDOM_DISABLED_RULES.map((id) => [id, { enabled: false }])
    ),
  });
}

function formatViolations(violations: axe.Result[]): string {
  if (violations.length === 0) return "";
  return violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.html).join("\n  ")}`
    )
    .join("\n\n");
}

describe("export HTML accessibility (axe-core)", () => {
  it("trail_stop guidebook block has no axe violations", async () => {
    const body = transformWidgetsForEpub(
      serializeGuidebookBlockToHtml("trail_stop", seedTrailStopPayload)
    );
    const results = await runAxeOnExportHtml(
      wrapExportChapterHtml(body, "Trail Stop")
    );
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  it("workshop guidebook block has no axe violations", async () => {
    const body = transformWidgetsForEpub(
      serializeGuidebookBlockToHtml("workshop", seedWorkshopPayload)
    );
    const results = await runAxeOnExportHtml(
      wrapExportChapterHtml(body, "Workshop")
    );
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  it("cheat_sheet guidebook block has no axe violations", async () => {
    const body = transformWidgetsForEpub(
      serializeGuidebookBlockToHtml("cheat_sheet", seedCheatSheetPayload)
    );
    const results = await runAxeOnExportHtml(
      wrapExportChapterHtml(body, "Cheat Sheet")
    );
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  it("Getting Started guidebook chapter has no axe violations", async () => {
    const mockBook = createGuidebookMockBook();
    const body = prepareChapterContent(mockBook, buildGettingStartedChapterContent());
    const results = await runAxeOnExportHtml(
      wrapExportChapterHtml(body, "Getting Started")
    );
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });

  it("simple chapter with headings, paragraph, and image has no axe violations", async () => {
    const body = transformWidgetsForEpub(`<h1>Chapter One</h1>
<p>Opening paragraph with <a href="https://example.com">a reference link</a>.</p>
<p><img src="assets/photo.jpg" alt="Mountain trail at sunrise"/></p>
<h2>Next Section</h2>
<p>Closing thoughts for the reader.</p>`);
    const results = await runAxeOnExportHtml(
      wrapExportChapterHtml(body, "Chapter One")
    );
    expect(results.violations, formatViolations(results.violations)).toEqual([]);
  });
});
