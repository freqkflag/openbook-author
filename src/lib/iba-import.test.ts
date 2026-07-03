/**
 * @vitest-environment jsdom
 */
import { describe, expect, it } from "vitest";
import JSZip from "jszip";
import { gzip } from "pako";
import { importIBAFile } from "@/lib/iba-import";

const INDEX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<document xmlns:sl="http://developer.apple.com/namespaces/sl" xmlns:sf="http://developer.apple.com/namespaces/sf">
  <sf:title>
    <sf:string>IBA Test Book</sf:string>
  </sf:title>
  <sf:authors>
    <sf:string>Test Author</sf:string>
  </sf:authors>
  <sl:content-node sl:GUID="guid-1" sl:parent-GUID="" sl:title="Chapter One"
    sl:node-type="chapter" sl:node-path="section1.xml.gz" />
</document>`;

const SECTION_XML = `<?xml version="1.0" encoding="UTF-8"?>
<section xmlns:sf="http://developer.apple.com/namespaces/sf" xmlns:sl="http://developer.apple.com/namespaces/sl">
  <sf:drawable-shape>
    <sf:p><sf:ghost-text>Hello from IBA import test.</sf:ghost-text></sf:p>
  </sf:drawable-shape>
</section>`;

async function buildMinimalIbaFile(): Promise<File> {
  const zip = new JSZip();
  zip.file("index.xml", INDEX_XML);
  zip.file("section1.xml.gz", gzip(SECTION_XML));
  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], "fixture.iba", { type: "application/octet-stream" });
}

describe("importIBAFile", () => {
  it("throws when index.xml is missing", async () => {
    const zip = new JSZip();
    zip.file("readme.txt", "not an iba file");
    const blob = await zip.generateAsync({ type: "blob" });
    const file = new File([blob], "empty.iba");
    await expect(importIBAFile(file)).rejects.toThrow(/index\.xml/i);
  });

  it("imports metadata and chapter text from a minimal fixture", async () => {
    const file = await buildMinimalIbaFile();
    const { book, warnings } = await importIBAFile(file);

    expect(book.metadata.title).toBe("IBA Test Book");
    expect(book.metadata.author).toBe("Test Author");
    expect(book.chapters.length).toBe(1);
    expect(book.chapters[0].title).toBe("Chapter One");
    expect(book.chapters[0].content).toContain("Hello from IBA import test.");
    expect(warnings.some((w) => w.includes("widgets"))).toBe(true);
  });
});
