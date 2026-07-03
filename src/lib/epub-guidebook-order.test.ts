import { describe, expect, it } from "vitest";
import type { GuidebookBlockType } from "@/types/guidebook";
import {
  getGuidebookBlockExportOrder,
  transformWidgetsForEpub,
} from "@/lib/epub";

function editorGuidebookBlock(
  blockType: GuidebookBlockType,
  payload: Record<string, unknown>
): string {
  const slug = blockType.replace("_", "-");
  const encoded = JSON.stringify(payload)
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;");
  return `<aside data-guidebook="${blockType}" data-payload="${encoded}" class="guidebook-block guidebook-${slug}"></aside>`;
}

const trailA = editorGuidebookBlock("trail_stop", {
  name: "Ridge Point",
  mileMarker: "2.1",
  elevation: "1200 ft",
  notes: "",
  amenities: [],
});

const workshopB = editorGuidebookBlock("workshop", {
  title: "Reflection",
  exercises: [{ id: "ex-1", prompt: "What did you notice?", responseType: "short" }],
});

const cheatC = editorGuidebookBlock("cheat_sheet", {
  title: "Gear",
  columns: 2,
  items: [{ id: "item-1", label: "Pack", value: "10L" }],
});

describe("guidebook block EPUB export order", () => {
  it("preserves trail → workshop → cheat sheet order", () => {
    const html = `<p>Intro</p>${trailA}${workshopB}${cheatC}<p>Outro</p>`;
    expect(getGuidebookBlockExportOrder(html)).toEqual([
      "trail_stop",
      "workshop",
      "cheat_sheet",
    ]);
  });

  it("preserves reversed cheat → workshop → trail order", () => {
    const html = `${cheatC}${workshopB}${trailA}`;
    expect(getGuidebookBlockExportOrder(html)).toEqual([
      "cheat_sheet",
      "workshop",
      "trail_stop",
    ]);
  });

  it("serializes all three block types with export markup", () => {
    const html = `${trailA}${workshopB}${cheatC}`;
    const result = transformWidgetsForEpub(html);

    expect(result).toContain('guidebook-trail-stop');
    expect(result).toContain("Ridge Point");
    expect(result).toContain('guidebook-workshop');
    expect(result).toContain("Reflection");
    expect(result).toContain('guidebook-cheat-sheet');
    expect(result).toContain("Gear");

    const headers = [...result.matchAll(/<header class="guidebook-block-header">([^<]+)<\/header>/g)].map(
      (m) => m[1]
    );
    expect(headers).toEqual(["Trail Stop", "Workshop", "Cheat Sheet"]);
  });

  it("handles data-payload before data-guidebook attribute order", () => {
    const payload = JSON.stringify({ name: "Late Stop", mileMarker: "9", elevation: "", notes: "", amenities: [] });
    const html = `<aside data-payload="${payload.replace(/"/g, "&quot;")}" data-guidebook="trail_stop" class="guidebook-block guidebook-trail-stop"></aside>${workshopB}`;
    expect(getGuidebookBlockExportOrder(html)).toEqual(["trail_stop", "workshop"]);
  });

  it("preserves trail stop names with ampersands in EPUB export", () => {
    const html = editorGuidebookBlock("trail_stop", {
      name: "Thompson & Sons",
      mileMarker: "4.2",
      elevation: "800 ft",
      notes: "Fish & chips at the lodge",
      amenities: [{ id: "a1", value: "Water & restrooms" }],
    });
    const result = transformWidgetsForEpub(html);

    expect(result).toContain("Thompson &amp; Sons");
    expect(result).toContain("Fish &amp; chips at the lodge");
    expect(result).toContain("Water &amp; restrooms");
    expect(result).not.toContain("Trail Stop</h3>");
  });
});
