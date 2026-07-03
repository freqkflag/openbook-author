import { beforeEach, describe, expect, it, vi } from "vitest";

const storage = new Map<string, string>();

vi.stubGlobal("localStorage", {
  getItem: (key: string) => storage.get(key) ?? null,
  setItem: (key: string, value: string) => {
    storage.set(key, value);
  },
  removeItem: (key: string) => {
    storage.delete(key);
  },
  clear: () => storage.clear(),
});

vi.stubGlobal("sessionStorage", {
  getItem: () => null,
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
});

vi.stubGlobal("window", {
  openBook: undefined,
});

describe("book-store hydrate", () => {
  beforeEach(async () => {
    storage.clear();
    vi.resetModules();
  });

  it("merges saved AI settings with defaults so new voice/style fields hydrate", async () => {
    storage.set(
      "openbook-author-ai",
      JSON.stringify({
        provider: "ollama",
        model: "llama3.2",
        voiceProfile: "Warm, practical trail-guide tone.",
        styleGuide: "Use second person. Short paragraphs.",
      })
    );

    const { useBookStore } = await import("./book-store");
    useBookStore.getState().hydrate();

    const { aiSettings } = useBookStore.getState();
    expect(aiSettings.provider).toBe("ollama");
    expect(aiSettings.model).toBe("llama3.2");
    expect(aiSettings.voiceProfile).toBe("Warm, practical trail-guide tone.");
    expect(aiSettings.styleGuide).toBe("Use second person. Short paragraphs.");
    expect(aiSettings.apiKey).toBe("");
    expect(aiSettings.baseUrl).toBe("");
  });
});
