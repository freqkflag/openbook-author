import { describe, expect, it } from "vitest";
import { htmlToMarkdown, markdownToHtml } from "@/lib/markdown-roundtrip";

describe("markdown-roundtrip", () => {
  it("converts basic HTML to markdown", () => {
    const md = htmlToMarkdown("<h1>Title</h1><p>Hello <strong>world</strong></p>");
    expect(md).toContain("# Title");
    expect(md).toContain("**world**");
  });

  it("converts markdown back to HTML", () => {
    const html = markdownToHtml("# Title\n\nHello **world**");
    expect(html).toContain("<h1>Title</h1>");
    expect(html).toContain("<strong>world</strong>");
  });
});
