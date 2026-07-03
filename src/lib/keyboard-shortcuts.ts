export interface ShortcutEntry {
  keys: string;
  description: string;
}

export const FORMATTING_SHORTCUTS: ShortcutEntry[] = [
  { keys: "⌘/Ctrl + B", description: "Bold" },
  { keys: "⌘/Ctrl + I", description: "Italic" },
  { keys: "⌘/Ctrl + U", description: "Underline" },
  { keys: "⌘/Ctrl + Shift + S", description: "Strikethrough" },
  { keys: "⌘/Ctrl + Shift + H", description: "Highlight" },
  { keys: "⌘/Ctrl + Alt + 1", description: "Heading 1" },
  { keys: "⌘/Ctrl + Alt + 2", description: "Heading 2" },
  { keys: "⌘/Ctrl + Alt + 3", description: "Heading 3" },
  { keys: "⌘/Ctrl + Shift + 8", description: "Bullet list" },
  { keys: "⌘/Ctrl + Shift + 7", description: "Numbered list" },
  { keys: "⌘/Ctrl + Shift + B", description: "Blockquote" },
  { keys: "⌘/Ctrl + Z", description: "Undo" },
  { keys: "⌘/Ctrl + Shift + Z", description: "Redo" },
];

export const APP_SHORTCUTS: ShortcutEntry[] = [
  { keys: "⌘/Ctrl + S", description: "Save book" },
  { keys: "⌘/Ctrl + P", description: "Toggle chapter preview" },
  { keys: "⌘/Ctrl + Alt + ↑", description: "Previous section" },
  { keys: "⌘/Ctrl + Alt + ↓", description: "Next section" },
  { keys: "⌘/Ctrl + /", description: "Show keyboard shortcuts" },
  { keys: "?", description: "Show keyboard shortcuts" },
];

export const KEYBOARD_SHORTCUTS: ShortcutEntry[] = [
  ...APP_SHORTCUTS,
  ...FORMATTING_SHORTCUTS,
];

export function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}

export function adjacentChapterId(
  chapters: { id: string }[],
  activeId: string,
  direction: "prev" | "next"
): string | null {
  const index = chapters.findIndex((ch) => ch.id === activeId);
  if (index === -1) return null;
  const nextIndex = direction === "prev" ? index - 1 : index + 1;
  if (nextIndex < 0 || nextIndex >= chapters.length) return null;
  return chapters[nextIndex].id;
}
