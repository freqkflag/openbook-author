import type { ChapterSectionType } from "@/types/book";

export interface UserSectionTemplate {
  id: string;
  name: string;
  description: string;
  defaultTitle: string;
  content: string;
  sectionType: ChapterSectionType;
  createdAt: string;
}

const STORAGE_KEY = "openbook-section-templates";

function readStorage(): UserSectionTemplate[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as UserSectionTemplate[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeStorage(templates: UserSectionTemplate[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function loadUserSectionTemplates(): UserSectionTemplate[] {
  return readStorage().sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

export function saveUserSectionTemplate(
  input: Omit<UserSectionTemplate, "id" | "createdAt">
): UserSectionTemplate {
  const template: UserSectionTemplate = {
    ...input,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
  };
  const templates = [template, ...readStorage()];
  writeStorage(templates);
  return template;
}

export function deleteUserSectionTemplate(id: string): void {
  writeStorage(readStorage().filter((template) => template.id !== id));
}
