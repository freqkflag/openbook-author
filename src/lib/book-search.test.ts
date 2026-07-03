import { describe, expect, it } from "vitest";
import {
  countMatches,
  replaceInBook,
  replaceInText,
  searchBook,
} from "@/lib/book-search";

const chapters = [
  { id: "a", title: "Intro", content: "<p>Hello world and hello again.</p>" },
  { id: "b", title: "Body", content: "<p>World building is fun.</p>" },
];

describe("book-search", () => {
  it("counts matches with case and whole-word options", () => {
    expect(countMatches("Hello hello HELLO", "hello")).toBe(3);
    expect(countMatches("Hello hello HELLO", "hello", { caseSensitive: true })).toBe(1);
    expect(countMatches("helloworld hello", "hello", { wholeWord: true })).toBe(1);
  });

  it("searches across chapters", () => {
    const results = searchBook(chapters, "hello");
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ chapterId: "a", matchCount: 2 });
  });

  it("replaces in a single chapter", () => {
    const { content, replacementCount } = replaceInText(
      "foo bar foo",
      "foo",
      "baz",
      { replaceAll: true }
    );
    expect(content).toBe("baz bar baz");
    expect(replacementCount).toBe(2);
  });

  it("replaces one match when replaceAll is false", () => {
    const { content, replacementCount } = replaceInText(
      "foo bar foo",
      "foo",
      "baz",
      { replaceAll: false }
    );
    expect(content).toBe("baz bar foo");
    expect(replacementCount).toBe(1);
  });

  it("replaces across the book", () => {
    const { updates, totalReplacements } = replaceInBook(chapters, "world", "planet", {
      replaceAll: true,
    });
    expect(totalReplacements).toBe(2);
    expect(updates).toHaveLength(2);
    expect(updates[0]?.content).toContain("Hello planet");
    expect(updates[1]?.content).toContain("planet building");
  });
});
