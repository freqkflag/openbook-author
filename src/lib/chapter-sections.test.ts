import { describe, expect, it } from "vitest";
import {
  SECTION_TEMPLATES,
  SECTION_CATEGORIES,
  getSectionTemplate,
  getSectionsByCategory,
} from "@/lib/chapter-sections";

describe("chapter section templates", () => {
  it("includes copyright and dedication front-matter types", () => {
    const ids = SECTION_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("copyright");
    expect(ids).toContain("dedication");
  });

  it("places copyright and dedication in front-matter category", () => {
    const copyright = getSectionTemplate("copyright");
    const dedication = getSectionTemplate("dedication");

    expect(copyright.category).toBe("front-matter");
    expect(dedication.category).toBe("front-matter");
    expect(copyright.content).toContain("Copyright ©");
    expect(copyright.content).toContain("All rights reserved");
    expect(dedication.content).toContain("section-dedication");
  });

  it("exposes front-matter as first category in picker", () => {
    const categories = getSectionsByCategory();
    expect(categories[0]?.key).toBe("front-matter");
    expect(SECTION_CATEGORIES["front-matter"]).toBe("Front Matter");
    expect(categories[0]?.sections.some((s) => s.id === "copyright")).toBe(true);
    expect(categories[0]?.sections.some((s) => s.id === "dedication")).toBe(true);
  });

  it("includes new reference and activity section templates", () => {
    const ids = SECTION_TEMPLATES.map((t) => t.id);
    expect(ids).toContain("resources");
    expect(ids).toContain("learning-objectives");
    expect(ids).toContain("practice-quiz");
    expect(ids).toContain("bibliography");

    expect(getSectionTemplate("resources").content).toContain("section-resources");
    expect(getSectionTemplate("learning-objectives").content).toContain(
      "section-learning-objectives"
    );
    expect(getSectionTemplate("practice-quiz").content).toContain("section-practice-quiz");
    expect(getSectionTemplate("bibliography").content).toContain("section-bibliography");
  });
});
