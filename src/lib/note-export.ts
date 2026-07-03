/** Footnote/endnote HTML transforms for EPUB/KBP export and import. */

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function decodeHtmlAttributeEntities(raw: string): string {
  return raw
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

export function encodeNoteContent(content: string): string {
  return content
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

export interface ParsedNoteRef {
  noteType: "footnote" | "endnote";
  id: string;
  content: string;
  index: number;
}

const NOTE_SPAN_RE =
  /<span[^>]*\bdata-note="(footnote|endnote)"[^>]*>[\s\S]*?<\/span>/gi;

function extractAttr(tag: string, name: string): string | null {
  const match = tag.match(new RegExp(`\\b${name}="([^"]*)"`));
  return match?.[1] ?? null;
}

/** Collect note references in document order. */
export function parseNoteReferences(html: string): ParsedNoteRef[] {
  const refs: ParsedNoteRef[] = [];
  const seen = new Set<string>();

  NOTE_SPAN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = NOTE_SPAN_RE.exec(html)) !== null) {
    const span = match[0];
    const noteType = extractAttr(span, "data-note") as "footnote" | "endnote" | null;
    const id = extractAttr(span, "data-id");
    const contentRaw = extractAttr(span, "data-content");
    if (!noteType || !id || (noteType !== "footnote" && noteType !== "endnote")) continue;
    const key = `${noteType}:${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    refs.push({
      noteType,
      id,
      content: contentRaw ? decodeHtmlAttributeEntities(contentRaw) : "",
      index: match.index,
    });
  }

  return refs.sort((a, b) => a.index - b.index);
}

/**
 * Transform editor note-reference spans into EPUB 3 noteref links and append
 * footnote asides / endnotes section at chapter end.
 */
export function transformNotesForEpub(html: string): string {
  const refs = parseNoteReferences(html);
  if (refs.length === 0) return html;

  const numberByKey = new Map<string, number>();
  let footnoteNum = 0;
  let endnoteNum = 0;

  for (const ref of refs) {
    const key = `${ref.noteType}:${ref.id}`;
    if (numberByKey.has(key)) continue;
    if (ref.noteType === "footnote") {
      footnoteNum += 1;
      numberByKey.set(key, footnoteNum);
    } else {
      endnoteNum += 1;
      numberByKey.set(key, endnoteNum);
    }
  }

  let result = html.replace(NOTE_SPAN_RE, (span) => {
    const noteType = extractAttr(span, "data-note") as "footnote" | "endnote" | null;
    const id = extractAttr(span, "data-id");
    if (!noteType || !id) return span;
    const num = numberByKey.get(`${noteType}:${id}`);
    if (num == null) return span;
    const refId = `noteref-${id}`;
    const targetId = `note-${id}`;
    return `<a href="#${targetId}" id="${refId}" epub:type="noteref"><sup>${num}</sup></a>`;
  });

  const footnoteBlocks: string[] = [];
  const endnoteBlocks: string[] = [];
  const rendered = new Set<string>();

  for (const ref of refs) {
    const key = `${ref.noteType}:${ref.id}`;
    if (rendered.has(key)) continue;
    rendered.add(key);
    const num = numberByKey.get(key)!;
    const targetId = `note-${ref.id}`;
    const backRef = `#noteref-${ref.id}`;
    const text = escapeHtml(ref.content.trim() || "(empty note)");
    const aside = `<aside epub:type="${ref.noteType}" id="${targetId}" class="book-${ref.noteType}">
  <p><a href="${backRef}">${num}</a>. ${text}</p>
</aside>`;
    if (ref.noteType === "footnote") {
      footnoteBlocks.push(aside);
    } else {
      endnoteBlocks.push(aside);
    }
  }

  const appendix: string[] = [...footnoteBlocks];
  if (endnoteBlocks.length) {
    appendix.push(
      `<section epub:type="endnotes" class="book-endnotes">${endnoteBlocks.join("\n")}</section>`
    );
  }

  return `${result}\n${appendix.join("\n")}`;
}

/** Reverse EPUB note markup back into editor note-reference spans. */
export function reverseNotesFromEpub(html: string): string {
  const noteById = new Map<
    string,
    { noteType: "footnote" | "endnote"; content: string }
  >();

  let result = html.replace(
    /<aside[^>]*\bepub:type="(footnote|endnote)"[^>]*\bid="note-([^"]*)"[^>]*>([\s\S]*?)<\/aside>/gi,
    (_, noteType, id, body) => {
      const text = body
        .replace(/<a[^>]*>[\s\S]*?<\/a>/gi, "")
        .replace(/<[^>]+>/g, " ")
        .replace(/^\s*\d+\.?\s*/, "")
        .replace(/\s+/g, " ")
        .trim();
      noteById.set(id, {
        noteType: noteType as "footnote" | "endnote",
        content: text,
      });
      return "";
    }
  );

  result = result.replace(
    /<section[^>]*\bepub:type="endnotes"[^>]*>([\s\S]*?)<\/section>/gi,
    (_, inner) => inner
  );

  result = result.replace(
    /<a[^>]*\bepub:type="noteref"[^>]*\bid="noteref-([^"]*)"[^>]*><sup>\d+<\/sup><\/a>/gi,
    (_, id) => {
      const stored = noteById.get(id);
      const noteType = stored?.noteType ?? "footnote";
      const content = encodeNoteContent(stored?.content ?? "");
      const label = noteType === "footnote" ? "fn" : "en";
      return `<span data-note="${noteType}" data-id="${id}" data-content="${content}" class="note-ref"><sup>${label}</sup></span>`;
    }
  );

  result = result.replace(
    /<a[^>]*\bhref="#note-([^"]*)"[^>]*\bepub:type="noteref"[^>]*><sup>\d+<\/sup><\/a>/gi,
    (_, id) => {
      const stored = noteById.get(id);
      const noteType = stored?.noteType ?? "footnote";
      const content = encodeNoteContent(stored?.content ?? "");
      const label = noteType === "footnote" ? "fn" : "en";
      return `<span data-note="${noteType}" data-id="${id}" data-content="${content}" class="note-ref"><sup>${label}</sup></span>`;
    }
  );

  return result;
}

/** Serialize a note reference for TipTap storage. */
export function serializeNoteReferenceToHtml(
  noteType: "footnote" | "endnote",
  id: string,
  content: string
): string {
  const label = noteType === "footnote" ? "fn" : "en";
  return `<span data-note="${noteType}" data-id="${id}" data-content="${encodeNoteContent(content)}" class="note-ref"><sup>${label}</sup></span>`;
}

export const TABLE_EXPORT_CSS = `/* Tables */
table {
  border-collapse: collapse;
  width: 100%;
  margin: 1.25em 0;
  font-size: 0.95em;
}
th, td {
  border: 1px solid #ccc;
  padding: 0.5em 0.75em;
  text-align: left;
  vertical-align: top;
}
th {
  background: #f0f4f8;
  font-weight: 600;
}
thead th { border-bottom-width: 2px; }

/* Notes */
a[epub\\:type="noteref"] {
  text-decoration: none;
  color: inherit;
}
a[epub\\:type="noteref"] sup {
  font-size: 0.75em;
  color: #006680;
  font-weight: 600;
}
aside[epub\\:type="footnote"],
aside[epub\\:type="endnote"] {
  font-size: 0.9em;
  color: #444;
  margin: 0.75em 0;
  padding: 0.5em 0 0.5em 1em;
  border-left: 2px solid #ccc;
}
section[epub\\:type="endnotes"] {
  margin-top: 2em;
  padding-top: 1em;
  border-top: 1px solid #ddd;
}
section[epub\\:type="endnotes"]::before {
  content: "Endnotes";
  display: block;
  font-weight: 600;
  margin-bottom: 0.75em;
}
`;
