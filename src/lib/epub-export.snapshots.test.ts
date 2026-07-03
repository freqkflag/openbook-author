import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";
import {
  exportToEpub,
  prepareChapterContent,
  transformWidgetsForEpub,
  GUIDEBOOK_EXPORT_CSS,
} from "@/lib/epub";
import {
  serializeGuidebookBlockToHtml,
  seedTrailStopPayload,
  seedWorkshopPayload,
  seedCheatSheetPayload,
  buildGettingStartedChapterContent,
  buildTrailReferenceChapterContent,
} from "@/lib/guidebook-seed";
import type { Book } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";

function createGuidebookMockBook(): Book {
  return {
    id: "snapshot-guidebook",
    metadata: {
      title: "Snapshot Guidebook",
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

/** Collapse insignificant whitespace so snapshots stay readable and stable. */
function normalizeExportHtml(html: string): string {
  return html
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

async function readZipText(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  expect(file).toBeDefined();
  return normalizeExportHtml(await file!.async("string"));
}

describe("guidebook block export snapshots", () => {
  it("trail_stop seed block", () => {
    const html = transformWidgetsForEpub(
      serializeGuidebookBlockToHtml("trail_stop", seedTrailStopPayload)
    );
    expect(normalizeExportHtml(html)).toMatchSnapshot();
  });

  it("workshop seed block", () => {
    const html = transformWidgetsForEpub(
      serializeGuidebookBlockToHtml("workshop", seedWorkshopPayload)
    );
    expect(normalizeExportHtml(html)).toMatchSnapshot();
  });

  it("cheat_sheet seed block", () => {
    const html = transformWidgetsForEpub(
      serializeGuidebookBlockToHtml("cheat_sheet", seedCheatSheetPayload)
    );
    expect(normalizeExportHtml(html)).toMatchSnapshot();
  });
});

describe("guidebook chapter export snapshots", () => {
  const mockBook = createGuidebookMockBook();

  it("Getting Started via prepareChapterContent (KBP + widgets)", () => {
    const html = prepareChapterContent(mockBook, buildGettingStartedChapterContent());
    expect(normalizeExportHtml(html)).toMatchSnapshot();
  });

  it("Trail Reference via transformWidgetsForEpub", () => {
    const html = transformWidgetsForEpub(buildTrailReferenceChapterContent());
    expect(normalizeExportHtml(html)).toMatchSnapshot();
  });
});

describe("guidebook export CSS snapshot", () => {
  it("GUIDEBOOK_EXPORT_CSS", () => {
    expect(GUIDEBOOK_EXPORT_CSS.trim()).toMatchSnapshot();
  });
});

describe("EPUB package export snapshots", () => {
  it("snapshots KBP guidebook package files", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-02T03:04:05.000Z"));

    try {
      const book: Book = {
        ...createGuidebookMockBook(),
        id: "snapshot-epub-book",
        kbpSettings: {
          ...DEFAULT_KBP_SETTINGS,
          enabled: true,
          dropCaps: true,
          sceneBreakStyle: "ornament",
        },
        chapters: [
          {
            id: "chapter-1",
            title: "Getting Started",
            content: buildGettingStartedChapterContent(),
            order: 0,
            sectionType: "chapter",
          },
        ],
      };

      const zip = await JSZip.loadAsync(await exportToEpub(book));
      const files = Object.keys(zip.files)
        .filter((path) => !zip.files[path].dir)
        .sort();

      expect(files).toMatchSnapshot();
      expect({
        "content.opf": await readZipText(zip, "content.opf"),
        "nav.xhtml": await readZipText(zip, "nav.xhtml"),
        "text/chapter0.xhtml": await readZipText(zip, "text/chapter0.xhtml"),
      }).toMatchSnapshot();
    } finally {
      vi.useRealTimers();
    }
  });
});
