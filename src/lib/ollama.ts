/** Common Ollama model presets for the AI settings picker */
export interface OllamaModelPreset {
  id: string;
  label: string;
  description: string;
}

export const OLLAMA_MODEL_PRESETS: OllamaModelPreset[] = [
  { id: "llama3.2", label: "Llama 3.2", description: "Meta general-purpose model" },
  { id: "llama3.1:8b", label: "Llama 3.1 8B", description: "Fast 8B variant" },
  { id: "mistral", label: "Mistral 7B", description: "Efficient open model" },
  { id: "mixtral", label: "Mixtral 8x7B", description: "Mixture-of-experts" },
  { id: "phi3", label: "Phi-3", description: "Microsoft compact model" },
  { id: "gemma2", label: "Gemma 2", description: "Google Gemma 2" },
  { id: "qwen2.5", label: "Qwen 2.5", description: "Alibaba multilingual model" },
  { id: "codellama", label: "Code Llama", description: "Code-focused Llama" },
];

export const DEFAULT_OLLAMA_BASE_URL = "http://localhost:11434";

export function normalizeOllamaBaseUrl(baseUrl?: string): string {
  return (baseUrl?.trim() || DEFAULT_OLLAMA_BASE_URL).replace(/\/$/, "");
}

export function resolveOllamaPresetId(model: string): string {
  const match = OLLAMA_MODEL_PRESETS.find((p) => p.id === model);
  return match ? match.id : "custom";
}

/** Structured JSON schema for outline action */
export interface OutlineSection {
  title: string;
  points: string[];
}

export interface OutlineResponse {
  title: string;
  sections: OutlineSection[];
}

/** Structured JSON schema for consistency-check action */
export interface ConsistencyIssue {
  type: "character" | "timeline" | "fact" | "tone" | "other";
  severity: "low" | "medium" | "high";
  description: string;
  suggestion?: string;
}

export interface ConsistencyCheckResponse {
  summary: string;
  issues: ConsistencyIssue[];
  passed: boolean;
}

export const STRUCTURED_JSON_ACTIONS = ["outline", "consistency-check"] as const;
export type StructuredJsonAction = (typeof STRUCTURED_JSON_ACTIONS)[number];

export function isStructuredJsonAction(action: string): action is StructuredJsonAction {
  return (STRUCTURED_JSON_ACTIONS as readonly string[]).includes(action);
}

export const OUTLINE_JSON_SCHEMA = {
  type: "object",
  required: ["title", "sections"],
  properties: {
    title: { type: "string", description: "Outline title" },
    sections: {
      type: "array",
      items: {
        type: "object",
        required: ["title", "points"],
        properties: {
          title: { type: "string" },
          points: { type: "array", items: { type: "string" } },
        },
      },
    },
  },
} as const;

export const CONSISTENCY_CHECK_JSON_SCHEMA = {
  type: "object",
  required: ["summary", "issues", "passed"],
  properties: {
    summary: { type: "string", description: "Brief overall assessment" },
    passed: { type: "boolean", description: "True if no significant issues found" },
    issues: {
      type: "array",
      items: {
        type: "object",
        required: ["type", "severity", "description"],
        properties: {
          type: {
            type: "string",
            enum: ["character", "timeline", "fact", "tone", "other"],
          },
          severity: { type: "string", enum: ["low", "medium", "high"] },
          description: { type: "string" },
          suggestion: { type: "string" },
        },
      },
    },
  },
} as const;

export function outlineResponseToHtml(data: OutlineResponse): string {
  const sections = data.sections
    .map((section) => {
      const items = section.points.map((p) => `<li>${escapeHtml(p)}</li>`).join("");
      return `<h2>${escapeHtml(section.title)}</h2><ul>${items}</ul>`;
    })
    .join("");
  return `<h1>${escapeHtml(data.title)}</h1>${sections}`;
}

export function consistencyCheckToHtml(data: ConsistencyCheckResponse): string {
  const status = data.passed
    ? '<p><strong>Status:</strong> Passed — no significant issues found.</p>'
    : '<p><strong>Status:</strong> Issues detected — review below.</p>';

  const issues =
    data.issues.length === 0
      ? "<p>No issues reported.</p>"
      : `<ul>${data.issues
          .map(
            (issue) =>
              `<li><strong>[${issue.severity}] ${issue.type}</strong>: ${escapeHtml(issue.description)}${
                issue.suggestion ? ` <em>Suggestion: ${escapeHtml(issue.suggestion)}</em>` : ""
              }</li>`
          )
          .join("")}</ul>`;

  return `<h1>Consistency Check</h1><p>${escapeHtml(data.summary)}</p>${status}${issues}`;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Parse and validate structured JSON from model output */
export function parseStructuredJson<T>(
  raw: string,
  validator: (data: unknown) => data is T
): T {
  const cleaned = raw
    .replace(/^```json?\n?/i, "")
    .replace(/\n?```$/i, "")
    .trim();
  const parsed: unknown = JSON.parse(cleaned);
  if (!validator(parsed)) {
    throw new Error("Model returned JSON that does not match the expected schema");
  }
  return parsed;
}

export function isOutlineResponse(data: unknown): data is OutlineResponse {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.title !== "string" || !Array.isArray(obj.sections)) return false;
  return obj.sections.every(
    (s) =>
      s &&
      typeof s === "object" &&
      typeof (s as OutlineSection).title === "string" &&
      Array.isArray((s as OutlineSection).points) &&
      (s as OutlineSection).points.every((p) => typeof p === "string")
  );
}

export function isConsistencyCheckResponse(data: unknown): data is ConsistencyCheckResponse {
  if (!data || typeof data !== "object") return false;
  const obj = data as Record<string, unknown>;
  if (typeof obj.summary !== "string" || typeof obj.passed !== "boolean") return false;
  if (!Array.isArray(obj.issues)) return false;
  return obj.issues.every(
    (issue) =>
      issue &&
      typeof issue === "object" &&
      typeof (issue as ConsistencyIssue).type === "string" &&
      typeof (issue as ConsistencyIssue).severity === "string" &&
      typeof (issue as ConsistencyIssue).description === "string"
  );
}

export function structuredJsonToHtml(action: StructuredJsonAction, raw: string): string {
  if (action === "outline") {
    const data = parseStructuredJson(raw, isOutlineResponse);
    return outlineResponseToHtml(data);
  }
  const data = parseStructuredJson(raw, isConsistencyCheckResponse);
  return consistencyCheckToHtml(data);
}

/** Server-side Ollama health check */
export async function checkOllamaHealth(
  baseUrl?: string
): Promise<{ reachable: boolean; models: string[]; error?: string }> {
  const url = `${normalizeOllamaBaseUrl(baseUrl)}/api/tags`;
  try {
    const res = await fetch(url, { method: "GET", signal: AbortSignal.timeout(5000) });
    if (!res.ok) {
      return { reachable: false, models: [], error: `HTTP ${res.status}` };
    }
    const data = (await res.json()) as { models?: { name: string }[] };
    const models = (data.models ?? []).map((m) => m.name);
    return { reachable: true, models };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Connection failed";
    return { reachable: false, models: [], error: message };
  }
}
