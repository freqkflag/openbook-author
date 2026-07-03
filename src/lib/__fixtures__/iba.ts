import JSZip from "jszip";
import { gzip } from "pako";

export const IBA_INDEX_XML = `<?xml version="1.0" encoding="UTF-8"?>
<book>
  <title><string>Fixture Field Guide</string></title>
  <authors><string>Casey Exporter</string></authors>
  <language>en-US</language>
  <copyright>Fixture copyright notice</copyright>
  <content-node
    GUID="chapter-1"
    parent-GUID=""
    title="Trailhead Basics"
    node-type="chapter"
    node-path="Sections/chapter-1.xml" />
</book>`;

export const IBA_CHAPTER_XML = `<?xml version="1.0" encoding="UTF-8"?>
<section>
  <drawable-shape tag="chapter-title">
    <p><title-name>Fixture Chapter Heading</title-name></p>
  </drawable-shape>
  <drawable-shape tag="body">
    <p><ghost-text>Pack water &amp; snacks before leaving.</ghost-text></p>
    <media><image-media path="hero.png" /></media>
  </drawable-shape>
</section>`;

const HERO_PNG = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
]);

interface IbaFixtureOptions {
  includeChapter?: boolean;
  includeIndex?: boolean;
  filename?: string;
}

export async function createIbaFixtureFile({
  includeChapter = true,
  includeIndex = true,
  filename = "fixture.iba",
}: IbaFixtureOptions = {}): Promise<File> {
  const zip = new JSZip();

  if (includeIndex) {
    zip.file("index.xml.gz", gzip(IBA_INDEX_XML));
  }

  if (includeChapter) {
    zip.file("Sections/chapter-1.xml", IBA_CHAPTER_XML);
    zip.file("Media/hero.png", HERO_PNG);
  }

  const blob = await zip.generateAsync({ type: "blob" });
  return new File([blob], filename, { type: "application/octet-stream" });
}
