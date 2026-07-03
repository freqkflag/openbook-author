import { describe, expect, it } from "vitest";
import { TEMPLATES, getTemplate, getDefaultKbpForTemplate } from "@/lib/templates";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import {
  buildGettingStartedChapterContent,
  buildTrailReferenceChapterContent,
} from "@/lib/guidebook-seed";

describe("templates", () => {
  it("getTemplate returns the matching template by id", () => {
    const guidebook = getTemplate("guidebook");
    expect(guidebook.id).toBe("guidebook");
    expect(guidebook.formatProfile).toBe("kbp");
    expect(guidebook.layoutMode).toBe("portrait");
  });

  it("getTemplate falls back to blank for unknown ids", () => {
    const unknown = getTemplate("nonexistent" as "guidebook");
    expect(unknown.id).toBe("blank");
  });

  it("getDefaultKbpForTemplate enables KBP for kbp-profile templates", () => {
    const kbp = getDefaultKbpForTemplate("guidebook");
    expect(kbp).toEqual({ ...DEFAULT_KBP_SETTINGS, enabled: true });
  });

  it("getDefaultKbpForTemplate leaves KBP disabled for standard templates", () => {
    const portrait = getDefaultKbpForTemplate("portrait");
    expect(portrait.enabled).toBe(false);
  });

  it("guidebook sample chapters use seed builders for block demos", () => {
    const guidebook = TEMPLATES.find((t) => t.id === "guidebook")!;
    const gettingStarted = guidebook.sampleChapters.find(
      (c) => c.title === "Chapter 1: Getting Started"
    );
    const trailReference = guidebook.sampleChapters.find((c) => c.title === "Trail Reference");

    expect(gettingStarted?.content).toBe(buildGettingStartedChapterContent());
    expect(trailReference?.content).toBe(buildTrailReferenceChapterContent());
  });
});
