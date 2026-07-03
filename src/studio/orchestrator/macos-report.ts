export type MacosReportKind = "bug" | "feature";

export interface MacosReport {
  kind: MacosReportKind;
  title: string;
  template: "Bug Report" | "Feature Request";
  labels: string[];
  body: string;
}

export interface GhIssueCreateOptions {
  repo: string;
  bodyFile: string;
}

const BUG_LABELS = ["bug", "router-ready"];
const FEATURE_LABELS = ["enhancement", "router-ready"];

const FIELD_ALIASES: Record<string, string> = {
  actual: "actual",
  "actual behavior": "actual",
  area: "affectedArea",
  "affected area": "affectedArea",
  behavior: "actual",
  environment: "environment",
  expected: "expected",
  "expected behavior": "expected",
  goal: "goal",
  logs: "logs",
  "logs screenshots": "logs",
  notes: "notes",
  screenshots: "logs",
  steps: "steps",
  "steps to reproduce": "steps",
  success: "successCriteria",
  "success criteria": "successCriteria",
  summary: "summary",
  title: "title",
  "user story": "userStory",
};

function normalizeHeading(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compactBlankLines(value: string): string {
  return value.replace(/\n{3,}/g, "\n\n").trim();
}

function firstNonEmptyLine(input: string): string {
  return input
    .split("\n")
    .map((line) => line.trim())
    .find((line) => line.length > 0) ?? "";
}

function detectKind(input: string): MacosReportKind {
  const firstLine = firstNonEmptyLine(input).toLowerCase();
  if (firstLine.startsWith("feature:")) return "feature";
  if (firstLine.startsWith("bug:")) return "bug";

  const text = input.toLowerCase();
  if (/\b(feature|enhancement|add|support)\b/.test(text)) return "feature";
  return "bug";
}

function parseFields(input: string): Record<string, string> {
  const fields: Record<string, string> = {};
  let currentKey: string | null = null;
  let currentValue: string[] = [];

  const flush = (): void => {
    if (currentKey) {
      fields[currentKey] = compactBlankLines(currentValue.join("\n"));
    }
  };

  for (const rawLine of input.split(/\r?\n/)) {
    const line = rawLine.trimEnd();
    const match = line.match(/^([A-Za-z][A-Za-z /-]{0,40}):\s*(.*)$/);
    const alias = match ? FIELD_ALIASES[normalizeHeading(match[1])] : undefined;

    if (alias) {
      flush();
      currentKey = alias;
      currentValue = match?.[2] ? [match[2]] : [];
      continue;
    }

    if (currentKey) {
      currentValue.push(line);
    }
  }

  flush();
  return fields;
}

function stripKindPrefix(line: string, kind: MacosReportKind): string | null {
  const prefix = kind === "bug" ? "Bug:" : "Feature:";
  if (!line.toLowerCase().startsWith(prefix.toLowerCase())) {
    return null;
  }
  return line.slice(prefix.length).trim();
}

function deriveTitle(input: string, kind: MacosReportKind, fields: Record<string, string>): string {
  const firstLineTitle = stripKindPrefix(firstNonEmptyLine(input), kind);
  const rawTitle = firstLineTitle || fields.title || fields.summary || fields.goal || "Untitled report";
  const prefix = kind === "bug" ? "[Bug]" : "[Feature]";

  return rawTitle.startsWith(prefix) ? rawTitle : `${prefix} ${rawTitle}`;
}

function valueOrFallback(value: string | undefined, fallback: string): string {
  return value && value.trim().length > 0 ? value.trim() : fallback;
}

function buildBugBody(fields: Record<string, string>): string {
  return compactBlankLines(`## Summary
${valueOrFallback(fields.summary, "No summary provided.")}

## Steps to reproduce
${valueOrFallback(fields.steps, "No reproduction steps provided.")}

## Expected behavior
${valueOrFallback(fields.expected, "Expected behavior not provided.")}

## Actual behavior
${valueOrFallback(fields.actual, "Actual behavior not provided.")}

## Affected area
${valueOrFallback(fields.affectedArea, "Other")}

## Logs / screenshots
${valueOrFallback(fields.logs, "None provided.")}

## Environment
${valueOrFallback(fields.environment, "macOS notification report")}`);
}

function buildFeatureBody(fields: Record<string, string>): string {
  return compactBlankLines(`## Goal
${valueOrFallback(fields.goal, fields.summary ?? "No goal provided.")}

## User story
${valueOrFallback(fields.userStory, "No user story provided.")}

## Affected area
${valueOrFallback(fields.affectedArea, "Other")}

## Success criteria
${valueOrFallback(fields.successCriteria, "No success criteria provided.")}

## Notes
${valueOrFallback(fields.notes, "None provided.")}`);
}

export function parseMacosReport(input: string): MacosReport {
  const kind = detectKind(input);
  const fields = parseFields(input);
  const title = deriveTitle(input, kind, fields);

  if (kind === "bug") {
    return {
      kind,
      title,
      template: "Bug Report",
      labels: BUG_LABELS,
      body: buildBugBody(fields),
    };
  }

  return {
    kind,
    title,
    template: "Feature Request",
    labels: FEATURE_LABELS,
    body: buildFeatureBody(fields),
  };
}

export function buildGhIssueCreateArgs(
  report: MacosReport,
  options: GhIssueCreateOptions
): string[] {
  const args = [
    "issue",
    "create",
    "--repo",
    options.repo,
    "--template",
    report.template,
    "--title",
    report.title,
    "--body-file",
    options.bodyFile,
  ];

  for (const label of report.labels) {
    args.push("--label", label);
  }

  return args;
}
