import { describe, expect, it } from "vitest";
import { TEMPLATES } from "@/lib/templates";
import { prepareChapterContent, transformWidgetsForEpub } from "@/lib/epub";
import {
  SEED_IDS,
  serializeGuidebookBlockToHtml,
  seedTrailStopPayload,
  seedWorkshopPayload,
  seedCheatSheetPayload,
  buildGettingStartedChapterContent,
  buildTrailReferenceChapterContent,
} from "@/lib/guidebook-seed";
import type { GuidebookBlockType } from "@/types/guidebook";
import {
  normalizeTrailStopPayload,
  normalizeWorkshopPayload,
  normalizeCheatSheetPayload,
} from "@/types/guidebook";
import type { Book } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";

const GUIDEBOOK_BLOCK_RE =
  /<aside[^>]*data-guidebook="(trail_stop|workshop|cheat_sheet)"[^>]*data-payload="([^"]*)"[^>]*>/g;

function createGuidebookMockBook(): Book {
  return {
    id: "test-guidebook",
    metadata: {
      title: "Test Guidebook",
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

function expectGuidebookExportMarkup(result: string): void {
  expect(result).toContain("guidebook-trail-stop");
  expect(result).toContain("guidebook-workshop");
  expect(result).toContain("guidebook-cheat-sheet");
  expect(result).toMatch(/<aside class="guidebook-block/);
  expect(result).toContain('class="guidebook-block-header"');
  expect(result).not.toMatch(/data-payload/);
}

function extractGuidebookBlocks(html: string): { blockType: GuidebookBlockType; payloadRaw: string }[] {
  const blocks: { blockType: GuidebookBlockType; payloadRaw: string }[] = [];
  let match: RegExpExecArray | null;
  const re = new RegExp(GUIDEBOOK_BLOCK_RE.source, "g");
  while ((match = re.exec(html)) !== null) {
    blocks.push({
      blockType: match[1] as GuidebookBlockType,
      payloadRaw: match[2]
        .replace(/&quot;/g, '"')
        .replace(/&amp;/g, "&"),
    });
  }
  return blocks;
}

describe("serializeGuidebookBlockToHtml", () => {
  it.each([
    ["trail_stop", "guidebook-trail-stop", seedTrailStopPayload],
    ["workshop", "guidebook-workshop", seedWorkshopPayload],
    ["cheat_sheet", "guidebook-cheat-sheet", seedCheatSheetPayload],
  ] as const)("emits parseable aside markup for %s", (blockType, cssClass, payload) => {
    const html = serializeGuidebookBlockToHtml(blockType, payload);
    expect(html).toMatch(new RegExp(`^<aside data-guidebook="${blockType}"`));
    expect(html).toContain(`class="guidebook-block ${cssClass}"`);
    expect(html).toContain("data-payload=");
  });

  it("uses default payload when none is provided", () => {
    const html = serializeGuidebookBlockToHtml("trail_stop");
    expect(html).toContain('data-guidebook="trail_stop"');
    const match = html.match(/data-payload="([^"]*)"/);
    expect(match).not.toBeNull();
    const parsed = JSON.parse(
      match![1].replace(/&quot;/g, '"').replace(/&amp;/g, "&")
    );
    expect(parsed.name).toBe("Trail Stop");
  });

  it("escapes ampersands and quotes in data-payload", () => {
    const html = serializeGuidebookBlockToHtml("trail_stop", {
      ...seedTrailStopPayload,
      name: 'Summit "Peak" & Ridge',
      notes: "Fish & chips",
    });
    expect(html).toContain("&amp;");
    expect(html).toContain("&quot;");

    const [block] = extractGuidebookBlocks(html);
    const parsed = JSON.parse(block.payloadRaw);
    expect(parsed.name).toBe('Summit "Peak" & Ridge');
    expect(parsed.notes).toBe("Fish & chips");
  });
});

describe("guidebook template seed", () => {
  const guidebookTemplate = TEMPLATES.find((t) => t.id === "guidebook");

  it("SEED_IDS are stable and prefixed for deterministic tests", () => {
    expect(Object.values(SEED_IDS).every((id) => id.startsWith("seed-"))).toBe(true);
    expect(new Set(Object.values(SEED_IDS)).size).toBe(Object.keys(SEED_IDS).length);
  });

  it("guidebook sample chapters include all three block types", () => {
    expect(guidebookTemplate).toBeDefined();
    const allContent = guidebookTemplate!.sampleChapters.map((c) => c.content).join("");
    const blockTypes = extractGuidebookBlocks(allContent).map((b) => b.blockType);

    expect(blockTypes).toContain("trail_stop");
    expect(blockTypes).toContain("workshop");
    expect(blockTypes).toContain("cheat_sheet");
  });

  it("Getting Started chapter contains one of each block type", () => {
    const chapter = guidebookTemplate!.sampleChapters.find(
      (c) => c.title === "Chapter 1: Getting Started"
    );
    expect(chapter).toBeDefined();

    const blocks = extractGuidebookBlocks(chapter!.content);
    expect(blocks.map((b) => b.blockType).sort()).toEqual(
      ["cheat_sheet", "trail_stop", "workshop"].sort()
    );
  });

  it("Trail Reference chapter contains all three block types", () => {
    const blocks = extractGuidebookBlocks(buildTrailReferenceChapterContent());
    expect(blocks.map((b) => b.blockType).sort()).toEqual(
      ["cheat_sheet", "trail_stop", "workshop"].sort()
    );
    expect(blocks.find((b) => b.blockType === "trail_stop")?.payloadRaw).toContain(
      "Creek Crossing Junction"
    );
  });

  it("seed payloads normalize without data loss", () => {
    const html = buildGettingStartedChapterContent();
    const blocks = extractGuidebookBlocks(html);

    for (const { blockType, payloadRaw } of blocks) {
      const parsed = JSON.parse(payloadRaw);
      switch (blockType) {
        case "trail_stop": {
          const normalized = normalizeTrailStopPayload(parsed);
          expect(normalized.name).toBe(seedTrailStopPayload.name);
          expect(normalized.amenities.length).toBeGreaterThan(0);
          expect(normalized.amenities.every((a) => a.id)).toBe(true);
          break;
        }
        case "workshop": {
          const normalized = normalizeWorkshopPayload(parsed);
          expect(normalized.title).toBe(seedWorkshopPayload.title);
          expect(normalized.exercises.length).toBe(seedWorkshopPayload.exercises.length);
          break;
        }
        case "cheat_sheet": {
          const normalized = normalizeCheatSheetPayload(parsed);
          expect(normalized.title).toBe(seedCheatSheetPayload.title);
          expect(normalized.items.length).toBe(seedCheatSheetPayload.items.length);
          break;
        }
        default: {
          const _exhaustive: never = blockType;
          throw new Error(`Unhandled block type: ${_exhaustive}`);
        }
      }
    }
  });
});

describe("guidebook seed export integration", () => {
  const mockBook = createGuidebookMockBook();

  it("Getting Started seed survives prepareChapterContent export transform", () => {
    const result = prepareChapterContent(mockBook, buildGettingStartedChapterContent());

    expectGuidebookExportMarkup(result);
    expect(result).toContain(seedTrailStopPayload.name);
    expect(result).toContain(seedWorkshopPayload.title);
    expect(result).toContain(seedCheatSheetPayload.title);
    expect(result).toContain('class="kbp-tip"');
  });

  it("Trail Reference seed survives transformWidgetsForEpub export transform", () => {
    const result = transformWidgetsForEpub(buildTrailReferenceChapterContent());

    expectGuidebookExportMarkup(result);
    expect(result).toContain("Creek Crossing Junction");
    expect(result).toContain("Navigation Check");
    expect(result).toContain(seedCheatSheetPayload.title);
  });
});
