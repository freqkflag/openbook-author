import type { Book, KBPSettings } from "@/types/book";

export const KBP_CSS = `/* KBP — Kindle Book Publishing profile */
body {
  font-family: Georgia, "Palatino Linotype", "Book Antiqua", Palatino, serif;
  line-height: 1.6;
  margin: 0;
  color: #1a1a1a;
}

h1 {
  font-size: 1.75em;
  font-weight: bold;
  margin: 2em 0 1em;
  page-break-before: always;
  text-align: center;
}

h2 {
  font-size: 1.35em;
  font-weight: bold;
  margin: 1.5em 0 0.75em;
}

h3 {
  font-size: 1.15em;
  font-weight: bold;
  margin: 1.25em 0 0.5em;
}

p {
  margin: 0;
  text-indent: 1.5em;
}

p.no-indent, h1 + p, h2 + p, h3 + p, blockquote + p,
.kbp-tip + p, .kbp-warning + p, .kbp-step + p,
.scene-break + p {
  text-indent: 0;
}

p.drop-cap::first-letter {
  float: left;
  font-size: 3.2em;
  line-height: 0.85;
  padding-right: 0.08em;
  font-weight: bold;
}

.scene-break {
  text-align: center;
  margin: 1.5em 0;
  text-indent: 0;
  letter-spacing: 0.3em;
  color: #666;
}

.scene-break.line {
  border-top: 1px solid #ccc;
  height: 0;
  margin: 2em auto;
  width: 30%;
}

.scene-break.ornament::before {
  content: "✦ ✦ ✦";
}

.kbp-tip {
  margin: 1.25em 1em;
  padding: 0.75em 1em;
  border-left: 4px solid #00a86b;
  background: #f0faf5;
  text-indent: 0;
}

.kbp-tip::before {
  content: "TIP: ";
  font-weight: bold;
  color: #00a86b;
}

.kbp-warning {
  margin: 1.25em 1em;
  padding: 0.75em 1em;
  border-left: 4px solid #e67e22;
  background: #fef9f0;
  text-indent: 0;
}

.kbp-warning::before {
  content: "NOTE: ";
  font-weight: bold;
  color: #e67e22;
}

.kbp-step {
  margin: 1em 0;
  padding: 0.5em 0 0.5em 2.5em;
  text-indent: 0;
  position: relative;
}

.kbp-step .step-number {
  position: absolute;
  left: 0;
  font-weight: bold;
  color: #333;
  width: 2em;
  text-align: right;
}

blockquote {
  margin: 1em 1.5em;
  font-style: italic;
  text-indent: 0;
}

img { max-width: 100%; height: auto; display: block; margin: 1em auto; }
ul, ol { margin: 0.8em 0; padding-left: 2em; }
`;

export function isKbpEnabled(book: Book): boolean {
  return book.formatProfile === "kbp" || book.kbpSettings?.enabled === true;
}

function withClassAttribute(attrs: string, className: string): string {
  const classMatch = attrs.match(/\sclass="([^"]*)"/);
  if (!classMatch) {
    return ` class="${className}"${attrs}`;
  }

  const classes = classMatch[1].split(/\s+/).filter(Boolean);
  if (classes.includes(className)) {
    return attrs;
  }

  return attrs.replace(
    classMatch[0],
    ` class="${[...classes, className].join(" ")}"`
  );
}

export function applyKbpToHtml(html: string, settings: KBPSettings): string {
  let result = html;

  if (settings.firstLineIndent) {
    result = result.replace(
      /<p\b([^>]*)>/g,
      (_, attrs: string) => `<p${withClassAttribute(attrs, "kbp-body")}>`
    );
  }

  if (settings.dropCaps) {
    result = result.replace(
      /(<h1[^>]*>.*?<\/h1>\s*)<p\b([^>]*)>/i,
      (_, heading: string, attrs: string) =>
        `${heading}<p${withClassAttribute(attrs, "drop-cap")}>`
    );
  }

  result = result.replace(
    /<div[^>]*data-callout="tip"[^>]*data-text="([^"]*)"[^>]*><\/div>/gi,
    '<div class="kbp-tip">$1</div>'
  );
  result = result.replace(
    /<div[^>]*data-callout="warning"[^>]*data-text="([^"]*)"[^>]*><\/div>/gi,
    '<div class="kbp-warning">$1</div>'
  );
  result = result.replace(
    /<div[^>]*data-callout="step"[^>]*data-number="([^"]*)"[^>]*data-text="([^"]*)"[^>]*><\/div>/gi,
    '<div class="kbp-step"><span class="step-number">$1</span>$2</div>'
  );

  const sceneBreak =
    settings.sceneBreakStyle === "line"
      ? '<p class="scene-break line"></p>'
      : settings.sceneBreakStyle === "ornament"
        ? '<p class="scene-break ornament"></p>'
        : '<p class="scene-break">* * *</p>';

  result = result.replace(
    /<hr[^>]*data-kbp="scene-break"[^>]*\/?>/gi,
    sceneBreak
  );

  return result;
}

export function kbpManifest(book: Book) {
  return {
    format: "kbp",
    version: "1.0",
    generator: "OpenBook Author",
    title: book.metadata.title,
    author: book.metadata.author,
    language: book.metadata.language,
    chapterCount: book.chapters.length,
    settings: book.kbpSettings,
    exportedAt: new Date().toISOString(),
    kdpNotes: [
      "Upload the included .epub file to Kindle Direct Publishing",
      "Or import chapters into Kindle Create from the HTML folder",
      "Chapter titles use H1 for automatic TOC generation",
    ],
  };
}
