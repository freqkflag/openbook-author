import { describe, expect, it } from "vitest";
import {
  parseNoteReferences,
  transformNotesForEpub,
  reverseNotesFromEpub,
  serializeNoteReferenceToHtml,
} from "@/lib/note-export";
import { prepareChapterContent } from "@/lib/epub";
import type { Book } from "@/types/book";

describe("note-export", () => {
  it("parseNoteReferences collects footnotes and endnotes in order", () => {
    const html = `<p>Text ${serializeNoteReferenceToHtml("footnote", "a", "First note")} and ${serializeNoteReferenceToHtml("endnote", "b", "End note")}.</p>`;
    const refs = parseNoteReferences(html);
    expect(refs).toHaveLength(2);
    expect(refs[0].noteType).toBe("footnote");
    expect(refs[0].content).toBe("First note");
    expect(refs[1].noteType).toBe("endnote");
  });

  it("transformNotesForEpub emits noteref links and aside blocks", () => {
    const html = `<p>See ${serializeNoteReferenceToHtml("footnote", "fn1", "Source citation")}.</p>`;
    const out = transformNotesForEpub(html);
    expect(out).toContain('epub:type="noteref"');
    expect(out).toContain('href="#note-fn1"');
    expect(out).toContain('epub:type="footnote"');
    expect(out).toContain("Source citation");
  });

  it("numbers multiple footnotes per chapter", () => {
    const html = `<p>${serializeNoteReferenceToHtml("footnote", "a", "One")} ${serializeNoteReferenceToHtml("footnote", "b", "Two")}</p>`;
    const out = transformNotesForEpub(html);
    expect(out.match(/epub:type="noteref"/g)?.length).toBe(2);
    expect(out).toContain("<sup>1</sup>");
    expect(out).toContain("<sup>2</sup>");
  });

  it("groups endnotes in endnotes section", () => {
    const html = `<p>${serializeNoteReferenceToHtml("endnote", "e1", "End content")}</p>`;
    const out = transformNotesForEpub(html);
    expect(out).toContain('epub:type="endnotes"');
    expect(out).toContain('epub:type="endnote"');
  });

  it("reverseNotesFromEpub restores editor spans", () => {
    const editorHtml = `<p>Ref ${serializeNoteReferenceToHtml("footnote", "x", "Reversed")}</p>`;
    const exported = transformNotesForEpub(editorHtml);
    const reversed = reverseNotesFromEpub(exported);
    expect(reversed).toContain('data-note="footnote"');
    expect(reversed).toContain('data-id="x"');
    expect(reversed).toContain("Reversed");
  });
});

describe("tables in export pipeline", () => {
  const book: Book = {
    id: "table-test",
    metadata: {
      title: "Table Test",
      subtitle: "",
      author: "Author",
      publisher: "",
      language: "en",
      description: "",
    },
    template: "blank",
    layoutMode: "portrait",
    formatProfile: "standard",
    kbpSettings: { enabled: false, firstLineIndent: false, dropCaps: false, sceneBreakStyle: "stars", chapterNumbering: false },
    chapters: [],
    assets: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };

  it("preserves table HTML through prepareChapterContent", () => {
    const table = `<table><thead><tr><th>Col A</th><th>Col B</th></tr></thead><tbody><tr><td>1</td><td>2</td></tr></tbody></table>`;
    const out = prepareChapterContent(book, table);
    expect(out).toContain("<table>");
    expect(out).toContain("<th>Col A</th>");
    expect(out).toContain("<td>1</td>");
  });
});
