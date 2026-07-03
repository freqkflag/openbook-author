import { describe, expect, it } from "vitest";
import { adjacentChapterId } from "./keyboard-shortcuts";

describe("keyboard-shortcuts", () => {
  const chapters = [{ id: "a" }, { id: "b" }, { id: "c" }];

  it("returns adjacent chapter ids", () => {
    expect(adjacentChapterId(chapters, "b", "prev")).toBe("a");
    expect(adjacentChapterId(chapters, "b", "next")).toBe("c");
    expect(adjacentChapterId(chapters, "a", "prev")).toBeNull();
    expect(adjacentChapterId(chapters, "c", "next")).toBeNull();
    expect(adjacentChapterId(chapters, "missing", "next")).toBeNull();
  });
});
