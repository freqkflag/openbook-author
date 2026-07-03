import { ADR_KEYWORD_MAP, AFFECTED_AREA_ADRS } from "./adr-keywords";
import { serializeHandoff } from "./parse-handoff";
import { formatRouterOutput } from "./prompts";
import type {
  Classification,
  EstimatedScope,
  ExecutionAgentId,
  Priority,
  RouteIssueInput,
  RouterHandoff,
} from "./types";

const CLASSIFICATION_KEYWORDS: Record<Classification, string[]> = {
  bug: ["bug", "fix", "error", "crash", "broken", "regression", "defect", "fail"],
  feature: ["feature", "add", "implement", "enhancement", "new", "support"],
  docs: ["docs", "documentation", "readme", "guide", "doc"],
  refactor: ["refactor", "cleanup", "restructure", "rename", "extract"],
  test: ["test", "testing", "coverage", "spec", "vitest", "e2e"],
  design: ["design", "ui", "ux", "accessibility", "a11y", "layout", "styling"],
  unknown: [],
};

const LABEL_CLASSIFICATION: Record<string, Classification> = {
  bug: "bug",
  fix: "bug",
  enhancement: "feature",
  feature: "feature",
  documentation: "docs",
  docs: "docs",
  refactor: "refactor",
  test: "test",
  testing: "test",
  design: "design",
  ui: "design",
  ux: "design",
};

const AGENT_BY_CLASSIFICATION: Record<Classification, ExecutionAgentId | null> = {
  bug: "debug-agent",
  feature: "feature-agent",
  docs: "docs-agent",
  refactor: "refactor-agent",
  test: "test-agent",
  design: "ui-agent",
  unknown: null,
};

const DEFAULT_DELIVERABLES: Record<Classification, string[]> = {
  bug: ["root-cause fix", "regression test", "documentation if behavior changed"],
  feature: ["implementation", "tests", "documentation"],
  docs: ["updated documentation", "examples if applicable"],
  refactor: ["refactored code", "existing tests pass"],
  test: ["new or updated tests", "coverage for target area"],
  design: ["UI/UX implementation", "accessibility review", "visual consistency"],
  unknown: [],
};

const DEFAULT_SUCCESS_CRITERIA: Record<Classification, string[]> = {
  bug: ["bug no longer reproduces", "existing tests pass"],
  feature: ["feature works as described", "existing tests pass", "docs updated if needed"],
  docs: ["documentation is accurate and complete"],
  refactor: ["behavior unchanged", "existing tests pass", "code is clearer"],
  test: ["tests cover described scenarios", "CI passes"],
  design: ["UI matches requirements", "accessibility checks pass"],
  unknown: [],
};

function normalizeText(text: string): string {
  return text.toLowerCase();
}

function countKeywordMatches(text: string, keywords: string[]): number {
  const normalized = normalizeText(text);
  return keywords.filter((kw) => normalized.includes(kw)).length;
}

export function classifyIssue(title: string, body: string, labels: string[] = []): Classification {
  const labelHits = labels
    .map((label) => LABEL_CLASSIFICATION[normalizeText(label.replace(/^router-ready$/i, ""))])
    .filter((c): c is Classification => c !== undefined);

  if (labelHits.length === 1) {
    return labelHits[0];
  }

  const combined = `${title}\n${body}`;
  const scores: Record<Exclude<Classification, "unknown">, number> = {
    bug: 0,
    feature: 0,
    docs: 0,
    refactor: 0,
    test: 0,
    design: 0,
  };

  for (const [classification, keywords] of Object.entries(CLASSIFICATION_KEYWORDS) as [
    Exclude<Classification, "unknown">,
    string[],
  ][]) {
    scores[classification] = countKeywordMatches(combined, keywords);
  }

  const ranked = (Object.entries(scores) as [Exclude<Classification, "unknown">, number][]).sort(
    (a, b) => b[1] - a[1]
  );

  if (ranked[0][1] === 0) {
    return "unknown";
  }

  if (ranked.length > 1 && ranked[0][1] === ranked[1][1]) {
    return "unknown";
  }

  return ranked[0][0];
}

export function scoreConfidence(
  classification: Classification,
  title: string,
  body: string,
  labels: string[] = []
): number {
  let score = 0.5;
  const combined = `${title}\n${body}`;
  const normalizedLabels = labels.map(normalizeText);

  if (classification !== "unknown") {
    const labelMatch = normalizedLabels.some(
      (label) => LABEL_CLASSIFICATION[label] === classification
    );
    if (labelMatch) score += 0.2;

    const keywordHits = countKeywordMatches(
      combined,
      CLASSIFICATION_KEYWORDS[classification]
    );
    if (keywordHits >= 2) score += 0.15;
    else if (keywordHits === 1) score += 0.08;

    if (classification === "bug" && /repro|steps to|expected|actual/i.test(body)) {
      score += 0.15;
    }

    if (body.trim().length >= 120) score += 0.1;
    else if (body.trim().length < 30) score -= 0.15;

    if (title.trim().length >= 10) score += 0.05;
  } else {
    score -= 0.25;
  }

  const distinctLabelClasses = new Set(
    normalizedLabels
      .map((label) => LABEL_CLASSIFICATION[label])
      .filter((c): c is Classification => c !== undefined)
  );
  if (distinctLabelClasses.size > 1) score -= 0.2;

  return Math.max(0, Math.min(1, Math.round(score * 100) / 100));
}

export function inferPriority(title: string, body: string, labels: string[] = []): Priority {
  const text = normalizeText(`${title} ${body} ${labels.join(" ")}`);
  if (/critical|p0|urgent|blocker|security/.test(text)) return "critical";
  if (/high|p1|important/.test(text)) return "high";
  if (/low|p3|minor|nice-to-have/.test(text)) return "low";
  return "medium";
}

export function inferScope(title: string, body: string, labels: string[] = []): EstimatedScope {
  const text = normalizeText(`${title} ${body} ${labels.join(" ")}`);
  if (/epic|large refactor|multi-week|architecture/.test(text)) return "epic";
  if (/large|major|cross-cutting|multiple modules/.test(text)) return "large";
  if (/small|tiny|one-liner|typo|quick/.test(text)) return "small";
  return "medium";
}

export function extractLinkedFiles(body: string, provided: string[] = []): string[] {
  const pathPattern = /(?:^|\s|`)((?:src|docs|\.github|electron)\/[\w./-]+)/g;
  const found = new Set(provided);

  let match: RegExpExecArray | null;
  while ((match = pathPattern.exec(body)) !== null) {
    found.add(match[1]);
  }

  return [...found];
}

export function resolveRelevantAdrs(
  title: string,
  body: string,
  linkedFiles: string[] = []
): string[] {
  const combined = normalizeText(`${title}\n${body}\n${linkedFiles.join("\n")}`);
  const adrs = new Set<string>();

  for (const [keyword, slug] of Object.entries(ADR_KEYWORD_MAP)) {
    if (combined.includes(keyword)) {
      adrs.add(slug);
    }
  }

  for (const [area, slugs] of Object.entries(AFFECTED_AREA_ADRS)) {
    if (combined.includes(area)) {
      for (const slug of slugs) {
        adrs.add(slug);
      }
    }
  }

  return [...adrs].sort();
}

function buildSummary(title: string, body: string): string {
  const firstParagraph = body
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .find((p) => p.length > 0);

  if (firstParagraph) {
    const sentence = firstParagraph.split(/(?<=[.!?])\s+/)[0];
    return sentence.length > 200 ? `${sentence.slice(0, 197)}...` : sentence;
  }

  return title.trim();
}

export function buildRouterHandoff(input: RouteIssueInput): RouterHandoff {
  const labels = input.labels ?? [];
  const linkedFiles = extractLinkedFiles(input.body, input.linkedFiles ?? []);
  const classification = classifyIssue(input.title, input.body, labels);
  const confidence = scoreConfidence(classification, input.title, input.body, labels);
  const escalate = confidence < 0.5 || classification === "unknown";
  const agent = escalate ? null : AGENT_BY_CLASSIFICATION[classification];
  const priority = inferPriority(input.title, input.body, labels);
  const estimatedScope = inferScope(input.title, input.body, labels);
  const relevantAdrs = resolveRelevantAdrs(input.title, input.body, linkedFiles);

  let recommendation: string | null = null;
  if (escalate) {
    recommendation =
      classification === "unknown"
        ? "I cannot confidently classify this issue. Escalate to Human Review."
        : `Low confidence (${confidence.toFixed(2)}) for ${classification} routing. Review before invoking agents.`;
  } else if (confidence < 0.75) {
    recommendation = `Route with caution: confidence ${confidence.toFixed(2)} for ${classification}.`;
  }

  const workflow = agent
    ? [agent, "review-agent", "pr-creator-agent"]
    : ["review-agent", "pr-creator-agent"];

  return {
    issue: input.issue ?? 0,
    title: input.title,
    classification,
    confidence,
    agent,
    priority,
    estimated_scope: estimatedScope,
    escalate,
    recommendation,
    relevant_adrs: relevantAdrs,
    deliverables: DEFAULT_DELIVERABLES[classification],
    success_criteria: DEFAULT_SUCCESS_CRITERIA[classification],
    context: {
      labels,
      linked_files: linkedFiles,
      summary: buildSummary(input.title, input.body),
    },
    workflow,
  };
}

export function routeIssue(input: RouteIssueInput): { handoff: RouterHandoff; output: string } {
  const handoff = buildRouterHandoff(input);
  const yaml = serializeHandoff(handoff);
  const output = formatRouterOutput(yaml, handoff.agent, handoff.workflow);
  return { handoff, output };
}
