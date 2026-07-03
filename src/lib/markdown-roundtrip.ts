/** Minimal HTML ↔ Markdown round-trip for authoring mode (Wave C #7) */
const BLOCK_TAGS = /<\/?(p|h1|h2|h3|blockquote|li|ul|ol|div)[^>]*>/gi;

export function htmlToMarkdown(html: string): string {
  let md = html
    .replace(/<h1[^>]*>([\s\S]*?)<\/h1>/gi, "# $1\n\n")
    .replace(/<h2[^>]*>([\s\S]*?)<\/h2>/gi, "## $1\n\n")
    .replace(/<h3[^>]*>([\s\S]*?)<\/h3>/gi, "### $1\n\n")
    .replace(/<strong[^>]*>([\s\S]*?)<\/strong>/gi, "**$1**")
    .replace(/<b[^>]*>([\s\S]*?)<\/b>/gi, "**$1**")
    .replace(/<em[^>]*>([\s\S]*?)<\/em>/gi, "*$1*")
    .replace(/<i[^>]*>([\s\S]*?)<\/i>/gi, "*$1*")
    .replace(/<blockquote[^>]*>([\s\S]*?)<\/blockquote>/gi, "> $1\n\n")
    .replace(/<li[^>]*>([\s\S]*?)<\/li>/gi, "- $1\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<p[^>]*>([\s\S]*?)<\/p>/gi, "$1\n\n");

  md = md.replace(BLOCK_TAGS, "");
  md = md.replace(/<[^>]+>/g, "");
  md = md.replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
  return md.replace(/\n{3,}/g, "\n\n").trim();
}

export function markdownToHtml(markdown: string): string {
  const lines = markdown.split(/\r?\n/);
  const html: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      continue;
    }
    if (trimmed.startsWith("# ")) {
      html.push(`<h1>${inlineMd(trimmed.slice(2))}</h1>`);
    } else if (trimmed.startsWith("## ")) {
      html.push(`<h2>${inlineMd(trimmed.slice(3))}</h2>`);
    } else if (trimmed.startsWith("### ")) {
      html.push(`<h3>${inlineMd(trimmed.slice(4))}</h3>`);
    } else if (trimmed.startsWith("> ")) {
      html.push(`<blockquote><p>${inlineMd(trimmed.slice(2))}</p></blockquote>`);
    } else if (trimmed.startsWith("- ")) {
      if (!inList) {
        html.push("<ul>");
        inList = true;
      }
      html.push(`<li>${inlineMd(trimmed.slice(2))}</li>`);
    } else {
      if (inList) {
        html.push("</ul>");
        inList = false;
      }
      html.push(`<p>${inlineMd(trimmed)}</p>`);
    }
  }
  if (inList) html.push("</ul>");
  return html.join("");
}

function inlineMd(text: string): string {
  return text
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>");
}
