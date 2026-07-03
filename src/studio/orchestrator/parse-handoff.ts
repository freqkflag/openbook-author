import yaml from "yaml";
import type {
  ExecutionHandoff,
  Handoff,
  HandoffType,
  ParseResult,
  ReviewHandoff,
  RouterHandoff,
  ValidationError,
  ValidationResult,
} from "./types";

const YAML_FENCE_RE = /```(?:yaml|yml)\s*\n([\s\S]*?)```/gi;

export function extractYamlBlocks(input: string): string[] {
  const blocks: string[] = [];
  let match: RegExpExecArray | null;
  const fenceRe = new RegExp(YAML_FENCE_RE.source, YAML_FENCE_RE.flags);

  while ((match = fenceRe.exec(input)) !== null) {
    blocks.push(match[1].trim());
  }

  if (blocks.length === 0 && input.trim()) {
    blocks.push(input.trim());
  }

  return blocks;
}

export function detectHandoffType(data: Record<string, unknown>): HandoffType {
  if ("verdict" in data && "adr_compliance" in data) {
    return "review";
  }
  if ("source_agent" in data && "status" in data && "changes_summary" in data) {
    return "execution";
  }
  if ("classification" in data && "workflow" in data) {
    return "router";
  }
  throw new Error("Unable to detect handoff type from YAML content");
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === "string");
}

function isNumber(value: unknown): value is number {
  return typeof value === "number" && !Number.isNaN(value);
}

function isBoolean(value: unknown): value is boolean {
  return typeof value === "boolean";
}

export function validateRouterHandoff(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isNumber(data.issue)) errors.push({ field: "issue", message: "issue must be a number" });
  if (!isNonEmptyString(data.title)) errors.push({ field: "title", message: "title is required" });
  if (!isNonEmptyString(data.classification)) {
    errors.push({ field: "classification", message: "classification is required" });
  }
  if (!isNumber(data.confidence)) {
    errors.push({ field: "confidence", message: "confidence must be a number" });
  }
  if (data.agent !== null && typeof data.agent !== "string") {
    errors.push({ field: "agent", message: "agent must be a string or null" });
  }
  if (!isNonEmptyString(data.priority)) {
    errors.push({ field: "priority", message: "priority is required" });
  }
  if (!isNonEmptyString(data.estimated_scope)) {
    errors.push({ field: "estimated_scope", message: "estimated_scope is required" });
  }
  if (!isBoolean(data.escalate)) {
    errors.push({ field: "escalate", message: "escalate must be a boolean" });
  }
  if (data.escalate === true && !isNonEmptyString(data.recommendation)) {
    errors.push({
      field: "recommendation",
      message: "recommendation is required when escalate is true",
    });
  }
  if (!isStringArray(data.relevant_adrs)) {
    errors.push({ field: "relevant_adrs", message: "relevant_adrs must be a string array" });
  }
  if (!isStringArray(data.deliverables)) {
    errors.push({ field: "deliverables", message: "deliverables must be a string array" });
  }
  if (!isStringArray(data.success_criteria)) {
    errors.push({
      field: "success_criteria",
      message: "success_criteria must be a string array",
    });
  }
  if (!data.context || typeof data.context !== "object") {
    errors.push({ field: "context", message: "context object is required" });
  } else {
    const ctx = data.context as Record<string, unknown>;
    if (!isStringArray(ctx.labels)) {
      errors.push({ field: "context.labels", message: "context.labels must be a string array" });
    }
    if (!isStringArray(ctx.linked_files)) {
      errors.push({
        field: "context.linked_files",
        message: "context.linked_files must be a string array",
      });
    }
    if (!isNonEmptyString(ctx.summary)) {
      errors.push({ field: "context.summary", message: "context.summary is required" });
    }
  }
  if (!isStringArray(data.workflow)) {
    errors.push({ field: "workflow", message: "workflow must be a string array" });
  }

  return errors;
}

export function validateExecutionHandoff(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isNumber(data.issue)) errors.push({ field: "issue", message: "issue must be a number" });
  if (!isNonEmptyString(data.source_agent)) {
    errors.push({ field: "source_agent", message: "source_agent is required" });
  }
  if (!isNonEmptyString(data.status)) {
    errors.push({ field: "status", message: "status is required" });
  }
  if (!isNonEmptyString(data.changes_summary)) {
    errors.push({ field: "changes_summary", message: "changes_summary is required" });
  }
  if (!isStringArray(data.files_touched)) {
    errors.push({ field: "files_touched", message: "files_touched must be a string array" });
  }
  if (!isStringArray(data.deliverables_completed)) {
    errors.push({
      field: "deliverables_completed",
      message: "deliverables_completed must be a string array",
    });
  }
  if (!isStringArray(data.success_criteria_met)) {
    errors.push({
      field: "success_criteria_met",
      message: "success_criteria_met must be a string array",
    });
  }
  if (!isStringArray(data.adrs_consulted)) {
    errors.push({ field: "adrs_consulted", message: "adrs_consulted must be a string array" });
  }
  if (!isBoolean(data.architecture_change)) {
    errors.push({
      field: "architecture_change",
      message: "architecture_change must be a boolean",
    });
  }
  if (!isStringArray(data.open_questions)) {
    errors.push({ field: "open_questions", message: "open_questions must be a string array" });
  }
  if (!isNonEmptyString(data.next_agent)) {
    errors.push({ field: "next_agent", message: "next_agent is required" });
  }

  return errors;
}

export function validateReviewHandoff(data: Record<string, unknown>): ValidationError[] {
  const errors: ValidationError[] = [];

  if (!isNumber(data.issue)) errors.push({ field: "issue", message: "issue must be a number" });
  if (data.source_agent !== "review-agent") {
    errors.push({ field: "source_agent", message: "source_agent must be review-agent" });
  }
  if (!isNonEmptyString(data.verdict)) {
    errors.push({ field: "verdict", message: "verdict is required" });
  }
  if (!isStringArray(data.findings)) {
    errors.push({ field: "findings", message: "findings must be a string array" });
  }
  if (!isStringArray(data.security_flags)) {
    errors.push({ field: "security_flags", message: "security_flags must be a string array" });
  }
  if (!isStringArray(data.a11y_flags)) {
    errors.push({ field: "a11y_flags", message: "a11y_flags must be a string array" });
  }
  if (!isNonEmptyString(data.adr_compliance)) {
    errors.push({ field: "adr_compliance", message: "adr_compliance is required" });
  }
  if (!isNonEmptyString(data.next_agent)) {
    errors.push({ field: "next_agent", message: "next_agent is required" });
  }

  return errors;
}

export function validateHandoff(data: Record<string, unknown>): ValidationResult {
  try {
    const handoffType = detectHandoffType(data);
    let errors: ValidationError[];

    switch (handoffType) {
      case "router":
        errors = validateRouterHandoff(data);
        break;
      case "execution":
        errors = validateExecutionHandoff(data);
        break;
      case "review":
        errors = validateReviewHandoff(data);
        break;
      default: {
        const _exhaustive: never = handoffType;
        return { valid: false, errors: [{ field: "type", message: `Unknown type: ${_exhaustive}` }] };
      }
    }

    return { valid: errors.length === 0, handoffType, errors };
  } catch (error) {
    return {
      valid: false,
      errors: [
        {
          field: "type",
          message: error instanceof Error ? error.message : "Unknown handoff type",
        },
      ],
    };
  }
}

export function parseHandoff(input: string): ParseResult {
  const blocks = extractYamlBlocks(input);
  if (blocks.length === 0) {
    throw new Error("No YAML content found in input");
  }

  let lastError: Error | null = null;

  for (const block of blocks) {
    try {
      const parsed = yaml.parse(block);
      if (!parsed || typeof parsed !== "object") {
        continue;
      }

      const data = parsed as Record<string, unknown>;
      const handoffType = detectHandoffType(data);
      const validation = validateHandoff(data);

      if (!validation.valid) {
        const messages = validation.errors.map((e) => `${e.field}: ${e.message}`).join("; ");
        throw new Error(`Invalid ${handoffType} handoff: ${messages}`);
      }

      return {
        handoff: data as unknown as Handoff,
        handoffType,
        rawYaml: block,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
    }
  }

  throw lastError ?? new Error("Failed to parse handoff YAML");
}

export function parseHandoffTyped<T extends HandoffType>(
  input: string,
  expectedType: T
): ParseResult & { handoff: T extends "router" ? RouterHandoff : T extends "execution" ? ExecutionHandoff : ReviewHandoff } {
  const result = parseHandoff(input);
  if (result.handoffType !== expectedType) {
    throw new Error(`Expected ${expectedType} handoff, got ${result.handoffType}`);
  }
  return result as ParseResult & {
    handoff: T extends "router" ? RouterHandoff : T extends "execution" ? ExecutionHandoff : ReviewHandoff;
  };
}

export function serializeHandoff(handoff: Handoff): string {
  return yaml.stringify(handoff).trim();
}
