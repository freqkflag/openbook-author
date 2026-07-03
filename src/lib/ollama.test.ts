import { describe, expect, it } from "vitest";
import {
  OLLAMA_MODEL_PRESETS,
  consistencyCheckToHtml,
  isConsistencyCheckResponse,
  isOutlineResponse,
  outlineResponseToHtml,
  parseStructuredJson,
  resolveOllamaPresetId,
  structuredJsonToHtml,
} from "@/lib/ollama";

describe("Ollama model presets", () => {
  it("includes common local models", () => {
    const ids = OLLAMA_MODEL_PRESETS.map((p) => p.id);
    expect(ids).toContain("llama3.2");
    expect(ids).toContain("mistral");
    expect(ids).toContain("qwen2.5");
  });

  it("resolves preset id or custom", () => {
    expect(resolveOllamaPresetId("llama3.2")).toBe("llama3.2");
    expect(resolveOllamaPresetId("my-custom-model")).toBe("custom");
  });
});

describe("structured JSON outline", () => {
  const sampleOutline = {
    title: "Chapter Outline",
    sections: [
      { title: "Opening", points: ["Hook the reader", "Set the scene"] },
      { title: "Development", points: ["Introduce conflict"] },
    ],
  };

  it("validates outline response shape", () => {
    expect(isOutlineResponse(sampleOutline)).toBe(true);
    expect(isOutlineResponse({ title: "x", sections: [] })).toBe(true);
    expect(isOutlineResponse({ title: 1, sections: [] })).toBe(false);
  });

  it("converts outline JSON to HTML", () => {
    const html = outlineResponseToHtml(sampleOutline);
    expect(html).toContain("<h1>Chapter Outline</h1>");
    expect(html).toContain("<h2>Opening</h2>");
    expect(html).toContain("<li>Hook the reader</li>");
  });

  it("parses fenced JSON from model output", () => {
    const raw = '```json\n{"title":"T","sections":[{"title":"S","points":["a"]}]}\n```';
    const parsed = parseStructuredJson(raw, isOutlineResponse);
    expect(parsed.title).toBe("T");
    expect(structuredJsonToHtml("outline", raw)).toContain("<h1>T</h1>");
  });
});

describe("structured JSON consistency check", () => {
  const sampleCheck = {
    summary: "Minor tone drift in section 2.",
    passed: false,
    issues: [
      {
        type: "tone" as const,
        severity: "medium" as const,
        description: "Voice shifts from formal to casual.",
        suggestion: "Use second person consistently.",
      },
    ],
  };

  it("validates consistency check response shape", () => {
    expect(isConsistencyCheckResponse(sampleCheck)).toBe(true);
    expect(isConsistencyCheckResponse({ summary: "ok", passed: true, issues: [] })).toBe(true);
    expect(isConsistencyCheckResponse({ summary: "ok", passed: "yes", issues: [] })).toBe(false);
  });

  it("converts consistency check JSON to HTML", () => {
    const html = consistencyCheckToHtml(sampleCheck);
    expect(html).toContain("<h1>Consistency Check</h1>");
    expect(html).toContain("Issues detected");
    expect(html).toContain("tone");
    expect(html).toContain("second person");
  });

  it("renders passed state", () => {
    const html = consistencyCheckToHtml({
      summary: "All good.",
      passed: true,
      issues: [],
    });
    expect(html).toContain("Passed");
    expect(html).toContain("All good.");
  });
});
