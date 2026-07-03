export type Classification =
  | "bug"
  | "feature"
  | "docs"
  | "refactor"
  | "test"
  | "design"
  | "unknown";

export type ExecutionAgentId =
  | "debug-agent"
  | "feature-agent"
  | "docs-agent"
  | "refactor-agent"
  | "test-agent"
  | "ui-agent";

export type Priority = "low" | "medium" | "high" | "critical";
export type EstimatedScope = "small" | "medium" | "large" | "epic";

export interface RouterHandoffContext {
  labels: string[];
  linked_files: string[];
  summary: string;
}

export interface RouterHandoff {
  issue: number;
  title: string;
  classification: Classification;
  confidence: number;
  agent: ExecutionAgentId | null;
  priority: Priority;
  estimated_scope: EstimatedScope;
  escalate: boolean;
  recommendation: string | null;
  relevant_adrs: string[];
  deliverables: string[];
  success_criteria: string[];
  context: RouterHandoffContext;
  workflow: string[];
}

export type ExecutionStatus = "complete" | "blocked" | "needs_human";

export interface AdrProposal {
  id: string;
  title: string;
  action: "new" | "supersede";
  supersedes?: string;
}

export interface ExecutionHandoff {
  issue: number;
  source_agent: string;
  status: ExecutionStatus;
  changes_summary: string;
  files_touched: string[];
  deliverables_completed: string[];
  success_criteria_met: string[];
  adrs_consulted: string[];
  architecture_change: boolean;
  adr_proposal: AdrProposal | null;
  open_questions: string[];
  next_agent: string;
}

export type ReviewVerdict = "approved" | "changes_requested" | "blocked";
export type AdrCompliance = "pass" | "adr_missing" | "adr_conflict";

export interface ReviewHandoff {
  issue: number;
  source_agent: "review-agent";
  verdict: ReviewVerdict;
  findings: string[];
  security_flags: string[];
  a11y_flags: string[];
  adr_compliance: AdrCompliance;
  next_agent: string;
}

export type HandoffType = "router" | "execution" | "review";

export type Handoff = RouterHandoff | ExecutionHandoff | ReviewHandoff;

export interface ProjectSubtask {
  issue_title: string;
  agent: string;
  priority: Priority;
  depends_on: Array<number | string>;
  deliverables: string[];
  success_criteria: string[];
}

export interface ProjectPlan {
  epic_issue: number;
  approve_subtasks: boolean;
  subtasks: ProjectSubtask[];
  recommended_order: number[];
}

export interface ProjectPlanParseResult {
  plan: ProjectPlan;
  rawYaml: string;
}

export interface WorkflowResult {
  nextAgent: string | null;
  nextPrompt: string;
  workflowStage: string;
  escalate?: boolean;
}

export interface ParseResult {
  handoff: Handoff;
  handoffType: HandoffType;
  rawYaml: string;
}

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  handoffType?: HandoffType;
  errors: ValidationError[];
}

export interface RouteIssueInput {
  title: string;
  body: string;
  issue?: number;
  labels?: string[];
  linkedFiles?: string[];
}
