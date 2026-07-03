import { describe, expect, it } from "vitest";
import { transformWidgetsForEpub } from "@/lib/epub";

describe("wave-c widget epub transforms", () => {
  it("exports media widget as audio element", () => {
    const html =
      '<div data-widget="media" data-kind="audio" data-src="assets/narration.mp3" data-title="Intro"></div>';
    const out = transformWidgetsForEpub(html);
    expect(out).toContain("<audio");
    expect(out).toContain("narration.mp3");
  });

  it("exports quiz widget with questions", () => {
    const payload = JSON.stringify([{ prompt: "2+2?", choices: ["3", "4"], answerIndex: 1 }]);
    const html = `<div data-widget="quiz" data-title="Math" data-payload="${payload.replace(/"/g, "&quot;")}"></div>`;
    const out = transformWidgetsForEpub(html);
    expect(out).toContain("quiz-widget");
    expect(out).toContain("2+2?");
  });
});
