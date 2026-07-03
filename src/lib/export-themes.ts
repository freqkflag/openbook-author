import type { Book, ExportThemeId, ExportThemeSettings } from "@/types/book";
import { DEFAULT_EXPORT_THEME } from "@/types/book";
import { getAssetByFilename } from "@/lib/asset-store";
import { isKbpEnabled } from "@/lib/kbp";

export type { ExportThemeId, ExportThemeSettings } from "@/types/book";
export { DEFAULT_EXPORT_THEME } from "@/types/book";

export const EXPORT_THEME_OPTIONS: {
  id: ExportThemeId;
  label: string;
  description: string;
}[] = [
  {
    id: "classic-serif",
    label: "Classic Serif",
    description: "Traditional book typography — Georgia and Times",
  },
  {
    id: "modern-sans",
    label: "Modern Sans",
    description: "Clean system sans-serif for contemporary nonfiction",
  },
  {
    id: "textbook",
    label: "Textbook",
    description: "Structured headings and Palatino body for instructional content",
  },
  {
    id: "guidebook",
    label: "Guidebook",
    description: "Trail-friendly greens and sans headings for field guides",
  },
  {
    id: "minimal",
    label: "Minimal",
    description: "Lightweight Helvetica layout with generous whitespace",
  },
];

const VALID_THEME_IDS = new Set<ExportThemeId>(
  EXPORT_THEME_OPTIONS.map((option) => option.id)
);

const THEME_STANDARD_CSS: Record<ExportThemeId, string> = {
  "classic-serif": `body {
  font-family: Georgia, "Times New Roman", serif;
  line-height: 1.6;
  margin: 1em;
  color: #1a1a1a;
}
h1 { font-size: 2em; margin-bottom: 0.5em; }
h2 { font-size: 1.5em; margin-top: 1.5em; }
h3 { font-size: 1.25em; }
p { margin: 0.8em 0; }
blockquote {
  border-left: 3px solid #8b7355;
  margin: 1em 0;
  padding-left: 1em;
  color: #444;
}
img { max-width: 100%; height: auto; }
ul, ol { margin: 0.8em 0; padding-left: 1.5em; }`,

  "modern-sans": `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  line-height: 1.55;
  margin: 1em;
  color: #111;
}
h1 { font-size: 1.85em; font-weight: 700; margin-bottom: 0.6em; letter-spacing: -0.02em; }
h2 { font-size: 1.35em; font-weight: 600; margin-top: 1.75em; }
h3 { font-size: 1.15em; font-weight: 600; }
p { margin: 0.75em 0; }
blockquote {
  border-left: 3px solid #2563eb;
  margin: 1em 0;
  padding-left: 1em;
  color: #374151;
}
img { max-width: 100%; height: auto; }
ul, ol { margin: 0.75em 0; padding-left: 1.5em; }`,

  textbook: `body {
  font-family: "Palatino Linotype", Palatino, Georgia, serif;
  line-height: 1.5;
  margin: 1em;
  color: #1a1a1a;
}
h1 {
  font-size: 1.75em;
  font-weight: bold;
  border-bottom: 2px solid #333;
  padding-bottom: 0.25em;
  margin-bottom: 0.75em;
}
h2 { font-size: 1.4em; font-weight: bold; color: #222; margin-top: 1.5em; }
h3 { font-size: 1.15em; font-weight: bold; margin-top: 1.25em; }
p { margin: 0.7em 0; }
blockquote {
  border-left: 4px solid #555;
  margin: 1em 0;
  padding: 0.5em 0 0.5em 1em;
  background: #f7f7f7;
  color: #333;
}
img { max-width: 100%; height: auto; }
ul, ol { margin: 0.7em 0; padding-left: 1.75em; }`,

  guidebook: `body {
  font-family: "Trebuchet MS", "Segoe UI", Helvetica, sans-serif;
  line-height: 1.55;
  margin: 1em;
  color: #1e3a2f;
}
h1 { font-size: 1.7em; color: #007a4d; margin-bottom: 0.5em; }
h2 { font-size: 1.35em; color: #0e7490; margin-top: 1.5em; }
h3 { font-size: 1.15em; color: #007a4d; }
p { margin: 0.75em 0; }
blockquote {
  border-left: 4px solid #00a86b;
  margin: 1em 0;
  padding-left: 1em;
  color: #2d4a3e;
  background: #f0faf5;
}
img { max-width: 100%; height: auto; border-radius: 4px; }
ul, ol { margin: 0.75em 0; padding-left: 1.5em; }`,

  minimal: `body {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  line-height: 1.7;
  margin: 1.5em auto;
  max-width: 40em;
  color: #333;
}
h1 { font-size: 1.5em; font-weight: 400; margin-bottom: 1em; }
h2 { font-size: 1.2em; font-weight: 500; margin-top: 2em; }
h3 { font-size: 1.05em; font-weight: 500; margin-top: 1.5em; }
p { margin: 1em 0; }
blockquote {
  border: none;
  padding: 0;
  margin: 1.5em 2em;
  font-style: italic;
  color: #666;
}
img { max-width: 100%; height: auto; }
ul, ol { margin: 1em 0; padding-left: 1.5em; }`,
};

/** KBP typography overrides layered on structural KBP_CSS */
const THEME_KBP_OVERRIDE_CSS: Record<ExportThemeId, string> = {
  "classic-serif": `body { font-family: Georgia, "Times New Roman", serif; color: #1a1a1a; }`,

  "modern-sans": `body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  color: #111;
}
h1, h2, h3 { letter-spacing: -0.01em; }`,

  textbook: `body {
  font-family: "Palatino Linotype", Palatino, Georgia, serif;
}
h1 { border-bottom: 2px solid #333; padding-bottom: 0.25em; }`,

  guidebook: `body {
  font-family: "Trebuchet MS", "Segoe UI", Helvetica, sans-serif;
  color: #1e3a2f;
}
h1 { color: #007a4d; }
h2 { color: #0e7490; }
blockquote { border-left-color: #00a86b; background: #f0faf5; }`,

  minimal: `body {
  font-family: "Helvetica Neue", Helvetica, Arial, sans-serif;
  color: #333;
}
h1, h2, h3 { font-weight: 400; }
blockquote { border: none; font-style: italic; color: #666; }`,
};

const CSS_ASSET_URL_RE = /url\s*\(\s*['"]?(assets\/[^'")\s]+)['"]?\s*\)/gi;

export function normalizeExportTheme(
  settings?: Partial<ExportThemeSettings> | null
): ExportThemeSettings {
  const themeId =
    settings?.themeId && VALID_THEME_IDS.has(settings.themeId)
      ? settings.themeId
      : DEFAULT_EXPORT_THEME.themeId;
  const customCss = settings?.customCss?.trim() || undefined;
  return { themeId, customCss };
}

export function getThemeStandardCss(themeId: ExportThemeId): string {
  return THEME_STANDARD_CSS[themeId];
}

export function getThemeKbpOverrideCss(themeId: ExportThemeId): string {
  return THEME_KBP_OVERRIDE_CSS[themeId];
}

export function getThemeId(book: Book): ExportThemeId {
  return normalizeExportTheme(book.exportTheme).themeId;
}

export function extractCustomCssAssetRefs(customCss: string): string[] {
  const refs = new Set<string>();
  let match: RegExpExecArray | null;
  const re = new RegExp(CSS_ASSET_URL_RE.source, "gi");
  while ((match = re.exec(customCss)) !== null) {
    refs.add(match[1]);
  }
  return [...refs];
}

export function getBrokenCustomCssAssetRefs(book: Book): string[] {
  const customCss = normalizeExportTheme(book.exportTheme).customCss;
  if (!customCss) return [];

  return extractCustomCssAssetRefs(customCss).filter((path) => {
    const filename = path.match(/^assets\/(.+)$/)?.[1];
    if (!filename) return false;
    return !getAssetByFilename(book, filename);
  });
}

export function appendCustomCss(css: string, customCss?: string): string {
  if (!customCss?.trim()) return css;
  return `${css}\n\n/* Custom export CSS */\n${customCss.trim()}`;
}

export function buildThemeTypographyCss(
  themeId: ExportThemeId,
  useKbp: boolean
): string {
  if (useKbp) {
    return getThemeKbpOverrideCss(themeId);
  }
  return getThemeStandardCss(themeId);
}

function extractBodyDeclaration(css: string): string | null {
  const match = css.match(/body\s*\{([\s\S]*?)\}/);
  return match?.[1]?.trim() ?? null;
}

function extractTopLevelRules(css: string): string[] {
  const withoutBody = css.replace(/body\s*\{[\s\S]*?\}/, "").trim();
  const rules: string[] = [];
  const blockRegex = /([^{]+)\{([^}]+)\}/g;
  let match = blockRegex.exec(withoutBody);
  while (match) {
    rules.push(`${match[1].trim()} { ${match[2].trim()} }`);
    match = blockRegex.exec(withoutBody);
  }
  return rules;
}

function scopeThemeRules(
  source: string,
  bodySelector: string,
  rulePrefix: string
): string[] {
  const rules: string[] = [];
  const bodyDecl = extractBodyDeclaration(source);
  if (bodyDecl) {
    rules.push(`${bodySelector} { ${bodyDecl} }`);
  }
  for (const rule of extractTopLevelRules(source)) {
    rules.push(`${rulePrefix} ${rule}`);
  }
  return rules;
}

/** Scoped typography for in-app print preview */
export function buildPreviewThemeCss(book: Book): string {
  const theme = normalizeExportTheme(book.exportTheme);
  const useKbp = isKbpEnabled(book);
  const scope = `.export-theme-${theme.themeId}`;
  const bodyScope = `${scope} .print-preview-body`;
  const source = useKbp
    ? getThemeKbpOverrideCss(theme.themeId)
    : getThemeStandardCss(theme.themeId);

  const rules = scopeThemeRules(source, bodyScope, bodyScope);

  if (theme.customCss) {
    rules.push(`${scope} ${theme.customCss}`);
  }

  return rules.join("\n");
}

export function getPreviewThemeClass(themeId: ExportThemeId): string {
  return `export-theme-${themeId}`;
}

/** Print/PDF body typography scoped to .print-body */
export function buildPrintBodyThemeCss(book: Book): string {
  const theme = normalizeExportTheme(book.exportTheme);
  const useKbp = isKbpEnabled(book);
  const scope = ".print-body";

  const source = useKbp
    ? getThemeKbpOverrideCss(theme.themeId)
    : getThemeStandardCss(theme.themeId);

  const rules = scopeThemeRules(source, scope, scope);

  if (theme.customCss) {
    rules.push(theme.customCss);
  }

  return rules.join("\n");
}
