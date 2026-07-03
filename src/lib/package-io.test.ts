import { describe, expect, it } from "vitest";
import type { Book } from "@/types/book";
import { DEFAULT_KBP_SETTINGS } from "@/types/book";
import { buildPackageZip, parsePackageFile } from "@/lib/package-io";

function createBook(): Book {
  return {
    id: "package-io-test",
    metadata: {
      title: "Package Test",
      subtitle: "",
      author: "Tester",
      publisher: "",
      language: "en",
      description: "",
      coverImage: "assets/cover.jpg",
    },
    template: "portrait",
    layoutMode: "portrait",
    formatProfile: "standard",
    kbpSettings: DEFAULT_KBP_SETTINGS,
    chapters: [
      {
        id: "ch-1",
        title: "Chapter",
        content: '<p>Hello <img src="assets/cover.jpg" alt="cover"/></p>',
        order: 0,
      },
    ],
    assets: [
      {
        id: "asset-1",
        filename: "cover.jpg",
        mimeType: "image/jpeg",
        size: 4,
        createdAt: "2026-01-01T00:00:00.000Z",
      },
    ],
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  };
}

describe("package-io", () => {
  it("round-trips book.json and asset blobs through buildPackageZip / parsePackageFile", async () => {
    const book = createBook();
    const blobs = new Map<string, Blob>([
      ["asset-1", new Blob(["fake"], { type: "image/jpeg" })],
    ]);

    const zipBlob = await buildPackageZip(book, blobs);
    const parsed = await parsePackageFile(zipBlob);

    expect(parsed.book.metadata.title).toBe("Package Test");
    expect(parsed.book.assets).toHaveLength(1);
    expect(parsed.book.assets[0].filename).toBe("cover.jpg");
    expect(parsed.assetBlobs.get("asset-1")).toBeDefined();
    expect(await parsed.assetBlobs.get("asset-1")!.text()).toBe("fake");
  });
});
