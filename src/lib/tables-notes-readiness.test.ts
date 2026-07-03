import { describe, expect, it } from "vitest";
import { assessPublishReadiness } from "@/lib/publish-readiness";
import type { Book } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import { serializeNoteReferenceToHtml } from "@/lib/note-export";

function mockBook(content: string): Book {
  return {
    id: "readiness-notes",
    metadata: {
      title: "Notes Test",
      subtitle: "",
      author: "Author",
      publisher: "",
      language: "en",
      description: "A long enough description for any optional KBP checks in other tests.",
      coverImage: "assets/cover.jpg",
    },
    template: "blank",
    layoutMode: "portrait",
    formatProfile: "standard",
    kbpSettings: DEFAULT_KBP_SETTINGS,
    chapters: [
      {
        id: "ch1",
        title: "Chapter 1",
        content,
        order: 0,
        sectionType: "chapter",
      },
    ],
    assets: [{ id: "a1", filename: "cover.jpg", mimeType: "image/jpeg", size: 1, createdAt: "" }],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("publish readiness — notes and tables", () => {
  it("warns on empty footnote content", () => {
    const emptyNote = serializeNoteReferenceToHtml("footnote", "e", "");
    const report = assessPublishReadiness(mockBook(`<p>Text ${emptyNote}</p>`));
    expect(report.issues.some((i) => i.id.startsWith("empty-note"))).toBe(true);
  });

  it("warns on table without header cells", () => {
    const report = assessPublishReadiness(
      mockBook("<table><tr><td>Only data</td></tr></table>")
    );
    expect(report.issues.some((i) => i.id.startsWith("table-no-header"))).toBe(true);
  });

  it("passes table with th cells", () => {
    const report = assessPublishReadiness(
      mockBook("<table><tr><th>H</th></tr><tr><td>D</td></tr></table>")
    );
    expect(report.issues.some((i) => i.id.startsWith("table-no-header"))).toBe(false);
  });
});
