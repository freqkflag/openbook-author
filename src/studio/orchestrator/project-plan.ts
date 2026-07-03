import yaml from "yaml";
import { extractYamlBlocks } from "./parse-handoff";
import type {
  Priority,
  ProjectPlan,
  ProjectPlanParseResult,
  ProjectSubtask,
  ValidationError,
} from "./types";

const PROJECT_MANAGER_MARKER_PREFIX = "<!-- openbook-author:project-manager";

const AGENT_LABEL: Record<string, string> = {
  "debug-agent": "agent:bug",
  "feature-agent": "agent:feature",
  "docs-agent": "agent:docs",
  "test-agent": "agent:test",
  "ui-agent": "agent:design",
  "refactor-agent": "agent:feature",
};

const PRIORITIES = new Set<Priority>(["low", "medium", "high", "critical"]);

export interface ProjectPlanValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

export interface ProjectChildIssueResult {
  title: string;
  url: string;
  existed: boolean;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isDependencyArray(value: unknown): value is Array<number | string> {
  return (
    Array.isArray(value) &&
    value.every((item) => typeof item === "number" || typeof item === "string")
  );
}

function isNumberArray(value: unknown): value is number[] {
  return Array.isArray(value) && value.every((item) => isNumber(item));
}

function normalizeProjectSubtask(data: Record<string, unknown>): ProjectSubtask {
  return {
    issue_title: String(data.issue_title ?? "").trim(),
    agent: String(data.agent ?? "").trim(),
    priority: isNonEmptyString(data.priority) && PRIORITIES.has(data.priority as Priority)
      ? data.priority as Priority
      : "medium",
    depends_on: isDependencyArray(data.depends_on) ? data.depends_on : [],
    deliverables: isStringArray(data.deliverables) ? data.deliverables : [],
    success_criteria: isStringArray(data.success_criteria) ? data.success_criteria : [],
  };
}

function normalizeProjectPlan(data: Record<string, unknown>): ProjectPlan {
  const subtasks = Array.isArray(data.subtasks)
    ? data.subtasks
        .filter((item): item is Record<string, unknown> => item !== null && typeof item === "object")
        .map(normalizeProjectSubtask)
    : [];

  return {
    epic_issue: isNumber(data.epic_issue) ? data.epic_issue : Number.NaN,
    approve_subtasks: isBoolean(data.approve_subtasks) ? data.approve_subtasks : false,
    subtasks,
    recommended_order: isNumberArray(data.recommended_order) ? data.recommended_order : [],
  };
}

export function validateProjectPlan(data: Record<string, unknown>): ProjectPlanValidationResult {
  const errors: ValidationError[] = [];

  if (!isNumber(data.epic_issue)) {
    errors.push({ field: "epic_issue", message: "epic_issue must be a number" });
  }
  if ("approve_subtasks" in data && !isBoolean(data.approve_subtasks)) {
    errors.push({
      field: "approve_subtasks",
      message: "approve_subtasks must be a boolean when present",
    });
  }
  if (!Array.isArray(data.subtasks) || data.subtasks.length === 0) {
    errors.push({ field: "subtasks", message: "at least one subtask is required" });
  } else {
    data.subtasks.forEach((item, index) => {
      if (item === null || typeof item !== "object") {
        errors.push({ field: `subtasks.${index}`, message: "subtask must be an object" });
        return;
      }

      const subtask = item as Record<string, unknown>;
      if (!isNonEmptyString(subtask.issue_title)) {
        errors.push({
          field: `subtasks.${index}.issue_title`,
          message: "issue_title is required",
        });
      }
      if (!isNonEmptyString(subtask.agent)) {
        errors.push({ field: `subtasks.${index}.agent`, message: "agent is required" });
      }
      if (!isNonEmptyString(subtask.priority) || !PRIORITIES.has(subtask.priority as Priority)) {
        errors.push({
          field: `subtasks.${index}.priority`,
          message: "priority must be low, medium, high, or critical",
        });
      }
      if (!isDependencyArray(subtask.depends_on)) {
        errors.push({
          field: `subtasks.${index}.depends_on`,
          message: "depends_on must be an array of numbers or strings",
        });
      }
      if (!isStringArray(subtask.deliverables)) {
        errors.push({
          field: `subtasks.${index}.deliverables`,
          message: "deliverables must be a string array",
        });
      }
      if (!isStringArray(subtask.success_criteria)) {
        errors.push({
          field: `subtasks.${index}.success_criteria`,
          message: "success_criteria must be a string array",
        });
      }
    });
  }
  if (!isNumberArray(data.recommended_order)) {
    errors.push({ field: "recommended_order", message: "recommended_order must be a number array" });
  }

  return { valid: errors.length === 0, errors };
}

export function parseProjectPlan(input: string): ProjectPlanParseResult {
  const blocks = extractYamlBlocks(input);
  if (blocks.length === 0) {
    throw new Error("No YAML content found in project plan");
  }

  let lastError: Error | null = null;

  for (const block of blocks) {
    try {
      const parsed = yaml.parse(block);
      if (!parsed || typeof parsed !== "object") {
        continue;
      }

      const data = parsed as Record<string, unknown>;
      const validation = validateProjectPlan(data);
      if (!validation.valid) {
        const messages = validation.errors.map((error) => `${error.field}: ${error.message}`).join("; ");
        throw new Error(`Invalid project manager plan: ${messages}`);
      }

      return {
        plan: normalizeProjectPlan(data),
        rawYaml: yaml.stringify(normalizeProjectPlan(data)).trim(),
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("Failed to parse project manager plan YAML");
}

export function serializeProjectPlan(plan: ProjectPlan): string {
  return yaml.stringify(plan).trim();
}

export function buildProjectPlanMarker(epicIssue: number): string {
  return `${PROJECT_MANAGER_MARKER_PREFIX} issue-${epicIssue} -->`;
}

export function buildProjectCreatedMarker(epicIssue: number): string {
  return `${PROJECT_MANAGER_MARKER_PREFIX}-created issue-${epicIssue} -->`;
}

export function buildProjectPlanComment(
  plan: ProjectPlan,
  childIssues: ProjectChildIssueResult[] = []
): string {
  const status = plan.approve_subtasks
    ? "Create child issues: approved"
    : "Create child issues: waiting for approval";
  const lines = [
    buildProjectPlanMarker(plan.epic_issue),
    `## Project Manager plan for #${plan.epic_issue}`,
    "",
    `**${status}.**`,
    "",
  ];

  if (!plan.approve_subtasks) {
    lines.push(
      "To create these child issues, retrigger the Project Manager automation with `approve_subtasks: true` in the webhook payload.",
      ""
    );
  }

  if (childIssues.length > 0) {
    lines.push("### Child issues", "");
    for (const issue of childIssues) {
      const suffix = issue.existed ? " (already existed)" : "";
      lines.push(`- ${issue.title}: ${issue.url}${suffix}`);
    }
    lines.push("");
  }

  lines.push("```yaml", serializeProjectPlan(plan), "```");
  return lines.join("\n");
}

export function buildSubtaskIssueBody(epicIssue: number, subtask: ProjectSubtask): string {
  const lines = [
    `<!-- openbook-author:project-subtask epic-${epicIssue} -->`,
    `Parent epic: #${epicIssue}`,
    "",
    `Assigned agent: @${subtask.agent}`,
    "",
    "## Deliverables",
    ...subtask.deliverables.map((item) => `- ${item}`),
    "",
    "## Success criteria",
    ...subtask.success_criteria.map((item) => `- ${item}`),
  ];

  if (subtask.depends_on.length > 0) {
    lines.push("", "## Dependencies", ...subtask.depends_on.map((item) => `- ${item}`));
  }

  return lines.join("\n");
}

export function buildSubtaskLabels(subtask: ProjectSubtask): string[] {
  const labels = [`priority: ${subtask.priority}`];
  const agentLabel = AGENT_LABEL[subtask.agent];

  if (agentLabel) {
    labels.push(agentLabel, "ready-for-execution");
  } else {
    labels.push("router-ready");
  }

  return labels;
}
