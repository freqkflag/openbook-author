import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  deleteUserSectionTemplate,
  loadUserSectionTemplates,
  saveUserSectionTemplate,
} from "@/lib/section-template-store";

describe("section-template-store", () => {
  beforeEach(() => {
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
    storage.clear();
    vi.stubGlobal("crypto", {
      randomUUID: () => "template-test-id",
    });
  });

  it("saves and loads user templates", () => {
    const saved = saveUserSectionTemplate({
      name: "My Journal",
      description: "Personal journal layout",
      defaultTitle: "Journal Entry",
      content: "<div>Journal</div>",
      sectionType: "journal",
    });

    expect(saved.id).toBe("template-test-id");
    expect(loadUserSectionTemplates()).toEqual([saved]);
  });

  it("deletes a saved template", () => {
    const saved = saveUserSectionTemplate({
      name: "Workbook",
      description: "Custom workbook",
      defaultTitle: "Exercise",
      content: "<div>Workbook</div>",
      sectionType: "workbook",
    });

    deleteUserSectionTemplate(saved.id);
    expect(loadUserSectionTemplates()).toEqual([]);
  });
});
