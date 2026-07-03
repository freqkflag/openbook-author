import { describe, expect, it } from "vitest";
import {
  extractYamlBlocks,
  parseHandoff,
  validateHandoff,
} from "./parse-handoff";
import { classifyIssue, routeIssue, scoreConfidence } from "./route-issue";
import { getNextStep } from "./workflow";
import type { RouterHandoff } from "./types";

const SAMPLE_ROUTER_YAML = `
issue: 42
title: Export fails on large guidebooks
classification: bug
confidence: 0.88
agent: debug-agent
priority: high
estimated_scope: medium
escalate: false
recommendation: null
relevant_adrs:
  - ADR-0003-epub-export-pipeline
deliverables:
  - root-cause fix
success_criteria:
  - bug no longer reproduces
context:
  labels: [bug]
  linked_files: [src/lib/epub-export.ts]
  summary: Export crashes when guidebook exceeds chapter limit.
workflow:
  - debug-agent
  - review-agent
  - pr-creator-agent
`;

const SAMPLE_EXECUTION_YAML = `
issue: 42
source_agent: debug-agent
status: complete
changes_summary: Fixed off-by-one in chapter batching
files_touched: [src/lib/epub-export.ts]
deliverables_completed: [root-cause fix]
success_criteria_met: [bug no longer reproduces]
adrs_consulted: [ADR-0003-epub-export-pipeline]
architecture_change: false
adr_proposal: null
open_questions: []
next_agent: review-agent
`;

describe("parse-handoff", () => {
  it("extracts YAML from fenced code blocks", () => {
    const input = "Some text\n```yaml\nissue: 1\ntitle: Test\n```\n";
    const blocks = extractYamlBlocks(input);
    expect(blocks).toHaveLength(1);
    expect(blocks[0]).toContain("issue: 1");
  });

  it("parses a valid router handoff", () => {
    const result = parseHandoff(SAMPLE_ROUTER_YAML);
    expect(result.handoffType).toBe("router");
    expect((result.handoff as RouterHandoff).agent).toBe("debug-agent");
  });

  it("rejects router handoff missing required fields", () => {
    expect(() =>
      parseHandoff("issue: 1\nclassification: bug\nworkflow:\n  - debug-agent\n")
    ).toThrow(/Invalid router handoff/);
  });

  it("parses execution handoff and detects type", () => {
    const result = parseHandoff(SAMPLE_EXECUTION_YAML);
    expect(result.handoffType).toBe("execution");
    expect(result.handoff).toMatchObject({ next_agent: "review-agent" });
  });
});

describe("workflow", () => {
  it("routes router handoff to execution agent", () => {
    const { handoff, handoffType } = parseHandoff(SAMPLE_ROUTER_YAML);
    const next = getNextStep(handoffType, handoff);
    expect(next.nextAgent).toBe("debug-agent");
    expect(next.nextPrompt).toContain("NEXT: Attach @debug-agent");
    expect(next.workflowStage).toBe("routed-to-debug-agent");
  });

  it("escalates low-confidence router handoffs", () => {
    const handoff: RouterHandoff = {
      issue: 1,
      title: "???",
      classification: "unknown",
      confidence: 0.3,
      agent: null,
      priority: "medium",
      estimated_scope: "medium",
      escalate: true,
      recommendation: "I cannot confidently classify this issue. Escalate to Human Review.",
      relevant_adrs: [],
      deliverables: [],
      success_criteria: [],
      context: { labels: [], linked_files: [], summary: "Unclear issue" },
      workflow: ["review-agent", "pr-creator-agent"],
    };

    const next = getNextStep("router", handoff);
    expect(next.nextAgent).toBeNull();
    expect(next.escalate).toBe(true);
    expect(next.workflowStage).toBe("escalated");
  });

  it("advances execution handoff to review-agent", () => {
    const { handoff, handoffType } = parseHandoff(SAMPLE_EXECUTION_YAML);
    const next = getNextStep(handoffType, handoff);
    expect(next.nextAgent).toBe("review-agent");
    expect(next.workflowStage).toBe("awaiting-review");
  });
});

describe("route-issue", () => {
  it("classifies bug issues to debug-agent", () => {
    const { handoff } = routeIssue({
      issue: 6,
      title: "Fix crash on export",
      body: "Steps to reproduce:\n1. Open guidebook\n2. Export EPUB\nExpected: file downloads\nActual: crash",
      labels: ["bug"],
    });

    expect(handoff.classification).toBe("bug");
    expect(handoff.agent).toBe("debug-agent");
    expect(handoff.escalate).toBe(false);
    expect(handoff.confidence).toBeGreaterThanOrEqual(0.75);
  });

  it("classifies feature issues to feature-agent", () => {
    const { handoff, output } = routeIssue({
      issue: 7,
      title: "Add drag-and-drop chapter reorder",
      body: "Users need to reorder chapters in the EPUB editor via drag-and-drop.",
      labels: ["enhancement", "editor"],
    });

    expect(handoff.classification).toBe("feature");
    expect(handoff.agent).toBe("feature-agent");
    expect(output).toContain("NEXT: Attach @feature-agent");
  });

  it("includes relevant ADRs from keyword map", () => {
    const { handoff } = routeIssue({
      title: "Improve epub export pipeline",
      body: "Large guidebook exports fail in src/lib/epub-export.ts",
    });

    expect(handoff.relevant_adrs).toContain("ADR-0003-epub-export-pipeline");
  });

  it("scores confidence lower for ambiguous issues", () => {
    const confidence = scoreConfidence("unknown", "Help", "Not sure what this is", []);
    expect(confidence).toBeLessThan(0.5);
  });
});

describe("validateHandoff", () => {
  it("validates a complete router handoff object", () => {
    const { handoff } = parseHandoff(SAMPLE_ROUTER_YAML);
    const result = validateHandoff(handoff as unknown as Record<string, unknown>);
    expect(result.valid).toBe(true);
    expect(result.handoffType).toBe("router");
  });
});
