#!/usr/bin/env node
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { parseHandoff, validateHandoff } from "./orchestrator/parse-handoff";
import { routeIssue } from "./orchestrator/route-issue";
import { getNextStep } from "./orchestrator/workflow";

interface CliArgs {
  command: string | null;
  title?: string;
  body?: string;
  issue?: number;
  file?: string;
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

Commands:
  route     Classify an issue and emit Router Handoff YAML
  next      Read a handoff file and print next agent instructions
  validate  Validate a handoff file (exit 0 valid, 1 invalid)
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
    default:
      console.error(`Unknown command: ${args.command}`);
      printUsage();
      return 1;
  }
}

process.exit(main());
