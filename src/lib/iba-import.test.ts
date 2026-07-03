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

const NESTED_INDEX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<document xmlns:sl="http://developer.apple.com/namespaces/sl" xmlns:sf="http://developer.apple.com/namespaces/sf">
  <sf:title><sf:string>Nested Book</sf:string></sf:title>
  <sl:content-node sl:GUID="part-1" sl:parent-GUID="" sl:title="Part I"
    sl:node-type="intro" sl:node-path="part1.xml.gz" />
  <sl:content-node sl:GUID="ch-1" sl:parent-GUID="part-1" sl:title="Getting Started"
    sl:node-type="chapter" sl:node-path="ch1.xml.gz" />
  <sl:content-node sl:GUID="ch-2" sl:parent-GUID="part-1" sl:title="Next Steps"
    sl:node-type="chapter" sl:node-path="ch2.xml.gz" />
  <sl:content-node sl:GUID="toc-1" sl:parent-GUID="" sl:title="Table of Contents"
    sl:node-type="toc" sl:node-path="toc.xml.gz" />
</document>`;

const TAGS_SECTION_XML = `<?xml version="1.0" encoding="UTF-8"?>
<section xmlns:sf="http://developer.apple.com/namespaces/sf" xmlns:sl="http://developer.apple.com/namespaces/sl">
  <sf:drawable-shape sl:tag="Section">
    <sf:p><sf:ghost-text>Section heading</sf:ghost-text></sf:p>
  </sf:drawable-shape>
  <sf:drawable-shape sl:tag="Subsection">
    <sf:p><sf:ghost-text>Subsection heading</sf:ghost-text></sf:p>
  </sf:drawable-shape>
  <sf:drawable-shape sl:tag="pullquote">
    <sf:p><sf:ghost-text>A memorable quote.</sf:ghost-text></sf:p>
  </sf:drawable-shape>
  <sf:drawable-shape sl:tag="KeyTakeaway">
    <sf:p><sf:ghost-text>Remember this key point.</sf:ghost-text></sf:p>
  </sf:drawable-shape>
  <sf:drawable-shape sl:tag="CustomUnknownTag">
    <sf:p><sf:ghost-text>Fallback paragraph.</sf:ghost-text></sf:p>
  </sf:drawable-shape>
</section>`;

const WIDGET_SECTION_XML = `<?xml version="1.0" encoding="UTF-8"?>
<section xmlns:sf="http://developer.apple.com/namespaces/sf" xmlns:sl="http://developer.apple.com/namespaces/sl">
  <sf:review-widget />
  <sf:drawable-shape>
    <sf:p><sf:ghost-text>Some text before the quiz.</sf:ghost-text></sf:p>
  </sf:drawable-shape>
</section>`;

async function buildMinimalIbaFile(): Promise<File> {
  const zip = new JSZip();
  zip.file("index.xml", INDEX_XML);
  zip.file("section1.xml.gz", gzip(SECTION_XML));
  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], "fixture.iba", { type: "application/octet-stream" });
}

async function buildNestedIbaFile(): Promise<File> {
  const zip = new JSZip();
  zip.file("index.xml", NESTED_INDEX_XML);
  zip.file("part1.xml.gz", gzip(SECTION_XML));
  zip.file("ch1.xml.gz", gzip(SECTION_XML));
  zip.file("ch2.xml.gz", gzip(SECTION_XML));
  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], "nested.iba", { type: "application/octet-stream" });
}

async function buildTagsIbaFile(): Promise<File> {
  const zip = new JSZip();
  zip.file("index.xml", INDEX_XML);
  zip.file("section1.xml.gz", gzip(TAGS_SECTION_XML));
  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], "tags.iba", { type: "application/octet-stream" });
}

async function buildWidgetIbaFile(): Promise<File> {
  const zip = new JSZip();
  zip.file("index.xml", INDEX_XML);
  zip.file("section1.xml.gz", gzip(WIDGET_SECTION_XML));
  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], "widget.iba", { type: "application/octet-stream" });
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
    const { book, warnings, diagnostics } = await importIBAFile(file);

    expect(book.metadata.title).toBe("IBA Test Book");
    expect(book.metadata.author).toBe("Test Author");
    expect(book.chapters.length).toBe(1);
    expect(book.chapters[0].title).toBe("Chapter One");
    expect(book.chapters[0].content).toContain("Hello from IBA import test.");
    expect(warnings.some((w) => w.includes("Imported 1 chapter"))).toBe(true);
    expect(diagnostics.imported.chapters).toBe(1);
    expect(diagnostics.hierarchy.length).toBe(1);
  });

  it("preserves nested chapter hierarchy in order and titles", async () => {
    const file = await buildNestedIbaFile();
    const { book, diagnostics } = await importIBAFile(file);

    expect(book.chapters.length).toBe(3);
    expect(book.chapters[0].title).toBe("Part I");
    expect(book.chapters[0].sectionType).toBe("introduction");
    expect(book.chapters[1].title).toBe("Part I › Getting Started");
    expect(book.chapters[2].title).toBe("Part I › Next Steps");
    expect(diagnostics.skipped.some((s) => s.includes("toc"))).toBe(true);
    expect(diagnostics.hierarchy[0].children.length).toBe(2);
  });

  it("maps sl:tag semantics to editor-compatible HTML", async () => {
    const file = await buildTagsIbaFile();
    const { book, diagnostics } = await importIBAFile(file);

    const html = book.chapters[0].content;
    expect(html).toContain("<h2>Section heading</h2>");
    expect(html).toContain("<h3>Subsection heading</h3>");
    expect(html).toContain("<blockquote>A memorable quote.</blockquote>");
    expect(html).toContain('class="iba-callout"');
    expect(html).toContain("Remember this key point.");
    expect(diagnostics.lost.unsupportedTags).toContain("CustomUnknownTag");
  });

  it("reports widgets and layout in diagnostics", async () => {
    const file = await buildWidgetIbaFile();
    const { diagnostics, warnings } = await importIBAFile(file);

    expect(diagnostics.lost.widgets.some((w) => /review|quiz/i.test(w))).toBe(true);
    expect(warnings.some((w) => /Not imported/i.test(w))).toBe(true);
  });
});
