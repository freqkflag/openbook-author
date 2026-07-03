#!/usr/bin/env node
import { execFileSync, execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseHandoff, validateHandoff } from "./orchestrator/parse-handoff";
import {
  buildProjectCreatedMarker,
  buildProjectPlanComment,
  buildProjectPlanMarker,
  buildSubtaskIssueBody,
  buildSubtaskLabels,
  parseProjectPlan,
} from "./orchestrator/project-plan";
import { routeIssue } from "./orchestrator/route-issue";
import { getNextStep } from "./orchestrator/workflow";
import type { ProjectChildIssueResult } from "./orchestrator/project-plan";

interface CliArgs {
  command: string | null;
  title?: string;
  body?: string;
  issue?: number;
  file?: string;
  repo?: string;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = { command: null };
  const positional: string[] = [];

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];

    if (arg === "--title" && argv[i + 1]) {
      args.title = argv[++i];
      continue;
    }
    if (arg === "--body" && argv[i + 1]) {
      args.body = argv[++i];
      continue;
    }
    if (arg === "--issue" && argv[i + 1]) {
      args.issue = Number(argv[++i]);
      continue;
    }
    if (arg === "--file" && argv[i + 1]) {
      args.file = argv[++i];
      continue;
    }
    if (arg === "--repo" && argv[i + 1]) {
      args.repo = argv[++i];
      continue;
    }

    if (!arg.startsWith("-")) {
      positional.push(arg);
    }
  }

  args.command = positional[0] ?? null;
  return args;
}

function printUsage(): void {
  console.log(`OpenBook Studio Orchestrator

Usage:
  npm run studio -- route --title "..." --body "..." [--issue 6]
  npm run studio -- route --issue 6
  npm run studio -- next --file handoff.yaml
  npm run studio -- validate --file handoff.yaml
  npm run studio -- validate-project --file project-plan.yaml
  npm run studio -- project-comment --file project-plan.yaml
  npm run studio -- apply-project --file project-plan.yaml --repo owner/repo

Commands:
  route     Classify an issue and emit Router Handoff YAML
  next      Read a handoff file and print next agent instructions
  validate  Validate a handoff file (exit 0 valid, 1 invalid)
  validate-project  Validate Project Manager subtask YAML
  project-comment   Print the Project Manager issue comment
  apply-project     Comment a plan and create approved child issues via gh
`);
}

function fetchIssueFromGh(issueNumber: number): { title: string; body: string; labels: string[] } | null {
  try {
    const json = execSync(`gh issue view ${issueNumber} --json title,body,labels`, {
      encoding: "utf8",
      stdio: ["pipe", "pipe", "pipe"],
    });
    const data = JSON.parse(json) as {
      title: string;
      body: string;
      labels: { name: string }[];
    };
    return {
      title: data.title,
      body: data.body ?? "",
      labels: data.labels.map((l) => l.name),
    };
  } catch {
    return null;
  }
}

function readHandoffFile(filePath: string): string {
  return readFileSync(filePath, "utf8");
}

function gh(args: string[]): string {
  return execFileSync("gh", args, {
    encoding: "utf8",
    env: {
      ...process.env,
      GH_TOKEN: process.env.GH_TOKEN ?? process.env.GITHUB_TOKEN,
    },
  });
}

function repoFromArgs(args: CliArgs): string | null {
  return args.repo ?? process.env.GITHUB_REPOSITORY ?? null;
}

function issueHasCommentMarker(repo: string, issue: number, marker: string): boolean {
  const comments = gh([
    "api",
    `repos/${repo}/issues/${issue}/comments`,
    "--paginate",
    "--jq",
    ".[].body",
  ]);
  return comments.includes(marker);
}

interface GhIssueListItem {
  title: string;
  url: string;
}

function isGhIssueListItem(value: unknown): value is GhIssueListItem {
  return (
    value !== null &&
    typeof value === "object" &&
    "title" in value &&
    "url" in value &&
    typeof value.title === "string" &&
    typeof value.url === "string"
  );
}

function findIssueByTitle(repo: string, title: string): GhIssueListItem | null {
  const json = gh([
    "issue",
    "list",
    "--repo",
    repo,
    "--state",
    "all",
    "--search",
    `"${title}" in:title`,
    "--json",
    "title,url",
  ]);
  const parsed: unknown = JSON.parse(json);

  if (!Array.isArray(parsed)) {
    return null;
  }

  return parsed.find((item) => isGhIssueListItem(item) && item.title === title) ?? null;
}

function postIssueComment(repo: string, issue: number, body: string): void {
  gh(["issue", "comment", String(issue), "--repo", repo, "--body", body]);
}

function createSubtaskIssues(repo: string, planFile: string): ProjectChildIssueResult[] {
  const { plan } = parseProjectPlan(readHandoffFile(planFile));
  const results: ProjectChildIssueResult[] = [];

  for (const subtask of plan.subtasks) {
    const existing = findIssueByTitle(repo, subtask.issue_title);
    if (existing) {
      results.push({
        title: existing.title,
        url: existing.url,
        existed: true,
      });
      continue;
    }

    const url = gh([
      "issue",
      "create",
      "--repo",
      repo,
      "--title",
      subtask.issue_title,
      "--body",
      buildSubtaskIssueBody(plan.epic_issue, subtask),
      "--label",
      buildSubtaskLabels(subtask).join(","),
    ]).trim();

    results.push({
      title: subtask.issue_title,
      url,
      existed: false,
    });
  }

  return results;
}

function cmdRoute(args: CliArgs): number {
  let title = args.title ?? "";
  let body = args.body ?? "";
  let labels: string[] = [];

  if (args.issue !== undefined) {
    const fetched = fetchIssueFromGh(args.issue);
    if (fetched) {
      title = title || fetched.title;
      body = body || fetched.body;
      labels = fetched.labels;
    } else if (!title) {
      console.error(
        `Warning: gh unavailable or issue #${args.issue} not found. Provide --title and --body manually.`
      );
    }
  }

  if (!title.trim()) {
    console.error("Error: --title is required (or fetch via --issue with gh CLI).");
    return 1;
  }

  const { output } = routeIssue({
    title,
    body,
    issue: args.issue,
    labels,
  });

  console.log(output);
  return 0;
}

function cmdNext(args: CliArgs): number {
  if (!args.file) {
    console.error("Error: --file is required for next command.");
    return 1;
  }

  try {
    const content = readHandoffFile(args.file);
    const { handoff, handoffType } = parseHandoff(content);
    const result = getNextStep(handoffType, handoff);

    console.log(`Stage: ${result.workflowStage}`);
    if (result.nextAgent) {
      console.log(`Next agent: ${result.nextAgent}`);
    }
    console.log(result.nextPrompt);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function cmdValidate(args: CliArgs): number {
  if (!args.file) {
    console.error("Error: --file is required for validate command.");
    return 1;
  }

  try {
    const content = readHandoffFile(args.file);
    const blocks = content.match(/```(?:yaml|yml)[\s\S]*?```/g) ?? [content];
    let parsed: Record<string, unknown> | null = null;

    for (const block of blocks) {
      try {
        const { handoff } = parseHandoff(block.includes("```") ? block : content);
        parsed = handoff as unknown as Record<string, unknown>;
        break;
      } catch {
        // try next block
      }
    }

    if (!parsed) {
      const { handoff } = parseHandoff(content);
      parsed = handoff as unknown as Record<string, unknown>;
    }

    const result = validateHandoff(parsed);

    if (result.valid) {
      console.log(`Valid ${result.handoffType} handoff`);
      return 0;
    }

    console.error(`Invalid ${result.handoffType ?? "unknown"} handoff:`);
    for (const err of result.errors) {
      console.error(`  - ${err.field}: ${err.message}`);
    }
    return 1;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function cmdValidateProject(args: CliArgs): number {
  if (!args.file) {
    console.error("Error: --file is required for validate-project command.");
    return 1;
  }

  try {
    const { plan } = parseProjectPlan(readHandoffFile(args.file));
    console.log(`Valid project manager plan for issue #${plan.epic_issue}`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function cmdProjectComment(args: CliArgs): number {
  if (!args.file) {
    console.error("Error: --file is required for project-comment command.");
    return 1;
  }

  try {
    const { plan } = parseProjectPlan(readHandoffFile(args.file));
    console.log(buildProjectPlanComment(plan));
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function cmdApplyProject(args: CliArgs): number {
  if (!args.file) {
    console.error("Error: --file is required for apply-project command.");
    return 1;
  }

  const repo = repoFromArgs(args);
  if (!repo) {
    console.error("Error: --repo is required when GITHUB_REPOSITORY is unset.");
    return 1;
  }

  try {
    const { plan } = parseProjectPlan(readHandoffFile(args.file));
    const planMarker = buildProjectPlanMarker(plan.epic_issue);

    if (!issueHasCommentMarker(repo, plan.epic_issue, planMarker)) {
      postIssueComment(repo, plan.epic_issue, buildProjectPlanComment(plan));
    }

    if (!plan.approve_subtasks) {
      console.log(`Posted project plan for issue #${plan.epic_issue}; waiting for approval.`);
      return 0;
    }

    const createdMarker = buildProjectCreatedMarker(plan.epic_issue);
    if (issueHasCommentMarker(repo, plan.epic_issue, createdMarker)) {
      console.log(`Child issue creation already recorded for issue #${plan.epic_issue}.`);
      return 0;
    }

    const childIssues = createSubtaskIssues(repo, args.file);
    postIssueComment(repo, plan.epic_issue, buildProjectPlanComment(plan, childIssues));
    console.log(`Applied ${childIssues.length} project subtasks for issue #${plan.epic_issue}.`);
    return 0;
  } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    return 1;
  }
}

function main(): number {
  const args = parseArgs(process.argv.slice(2));

  if (!args.command || args.command === "help" || args.command === "--help") {
    printUsage();
    return args.command ? 0 : 1;
  }

  switch (args.command) {
    case "route":
      return cmdRoute(args);
    case "next":
      return cmdNext(args);
    case "validate":
      return cmdValidate(args);
    case "validate-project":
      return cmdValidateProject(args);
    case "project-comment":
      return cmdProjectComment(args);
    case "apply-project":
      return cmdApplyProject(args);
    default:
      console.error(`Unknown command: ${args.command}`);
      printUsage();
      return 1;
  }
}

process.exit(main());
