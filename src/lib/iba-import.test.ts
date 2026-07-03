import { Window } from "happy-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createIbaFixtureFile } from "@/lib/__fixtures__/iba";
import { importIBAFile } from "@/lib/iba-import";

beforeEach(() => {
  const domWindow = new Window();
  vi.stubGlobal("DOMParser", domWindow.DOMParser);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("importIBAFile", () => {
  it("imports metadata, chapter text, and inline image assets from an IBA fixture", async () => {
    const result = await importIBAFile(await createIbaFixtureFile());

    expect(result.book.metadata).toEqual({
      title: "Fixture Field Guide",
      subtitle: "",
      author: "Casey Exporter",
      publisher: "Imported from iBooks Author",
      language: "en-US",
      description: "Fixture copyright notice",
    });
    expect(result.book.template).toBe("portrait");
    expect(result.book.formatProfile).toBe("standard");
    expect(result.book.chapters).toHaveLength(1);
    expect(result.book.chapters[0]).toMatchObject({
      title: "Trailhead Basics",
      order: 0,
      sectionType: "chapter",
    });
    expect(result.book.chapters[0].content).toContain(
      "<h1>Fixture Chapter Heading</h1>"
    );
    expect(result.book.chapters[0].content).toContain(
      "<p>Pack water &amp; snacks before leaving.</p>"
    );
    expect(result.book.chapters[0].content).toContain(
      '<img src="data:image/png;base64,'
    );
    expect(result.warnings).toEqual([
      "Layout and interactive widgets (quizzes, 3D, review cards) are not imported — text and images only.",
    ]);
  });

  it("falls back to an unsupported-content chapter when a fixture section is missing", async () => {
    const result = await importIBAFile(
      await createIbaFixtureFile({ includeChapter: false })
    );

    expect(result.book.chapters).toHaveLength(1);
    expect(result.book.chapters[0]).toMatchObject({
      title: "Imported Content",
      content:
        "<p>Content could not be extracted. The file may use unsupported widgets or layout.</p>",
      order: 0,
      sectionType: "chapter",
    });
    expect(result.warnings).toContain("Could not load section: Trailhead Basics");
  });

  it("rejects IBA packages that do not contain an index XML fixture", async () => {
    await expect(
      importIBAFile(await createIbaFixtureFile({ includeIndex: false }))
    ).rejects.toThrow(
      "Could not find index.xml in this file. Make sure it is a valid .iba or .book file."
    );
  });
});
