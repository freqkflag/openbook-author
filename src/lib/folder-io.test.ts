import { describe, expect, it } from "vitest";
import type { Book } from "@/types/book";
import {
  buildBookJson,
  buildFolderWritePayload,
  buildManifestJson,
  parseFolderContents,
  validateFolderProject,
} from "@/lib/folder-io";

const sampleBook: Book = {
  id: "book-1",
  metadata: {
    title: "Git Test",
    subtitle: "",
    author: "Author",
    publisher: "OpenBook",
    language: "en",
    description: "",
  },
  template: "blank",
  layoutMode: "portrait",
  formatProfile: "standard",
  kbpSettings: {
    enabled: false,
    firstLineIndent: true,
    dropCaps: false,
    sceneBreakStyle: "asterisks",
    chapterNumbering: true,
  },
  chapters: [
    {
      id: "ch-1",
      title: "Chapter One",
      content: "<p>Hello git</p>",
      order: 0,
      sectionType: "chapter",
    },
  ],
  assets: [],
  createdAt: "2026-07-03T00:00:00.000Z",
  updatedAt: "2026-07-03T00:00:00.000Z",
};

describe("folder-io", () => {
  it("builds pretty-printed manifest and book json", () => {
    const manifest = buildManifestJson(sampleBook);
    const bookJson = buildBookJson(sampleBook);
    expect(manifest).toContain("\n");
    expect(manifest).toContain('"format": "openbook"');
    expect(bookJson).toContain("\n");
    expect(bookJson).toContain('"title": "Git Test"');
    expect(bookJson).not.toContain("packagePath");
  });

  it("round-trips folder payload", async () => {
    const payload = await buildFolderWritePayload(sampleBook, new Map());
    validateFolderProject(payload);
    const { book, assetBlobs } = parseFolderContents({
      ...payload,
      projectPath: "/tmp/my-book",
    });
    expect(book.metadata.title).toBe("Git Test");
    expect(book.storageMode).toBe("folder");
    expect(book.projectPath).toBe("/tmp/my-book");
    expect(assetBlobs.size).toBe(0);
  });

  it("rejects invalid folder projects", () => {
    expect(() => validateFolderProject({ manifestJson: "", bookJson: "{}" })).toThrow(
      /manifest\.json/
    );
  });
});
