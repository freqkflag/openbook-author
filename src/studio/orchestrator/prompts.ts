export function formatNextLine(agent: string): string {
  return `NEXT: Attach @${agent} and paste the handoff above.`;
}

export function formatWorkflowLine(workflow: string[]): string {
  const agents = workflow.map((agent) => `@${agent}`).join(" → ");
  return `WORKFLOW: ${agents}`;
}

export function formatEscalationMessage(recommendation: string | null): string {
  const message =
    recommendation ??
    "I cannot confidently classify this issue. Escalate to Human Review.";
  return `ESCALATE: ${message}`;
}

export function formatPrCreatorInstructions(issue: number): string {
  return [
    "PR CREATOR: Review approved.",
    `1. Ensure the branch has a conventional commit for issue #${issue}.`,
    `2. Create the PR with a conventional title and a body that includes "Closes #${issue}".`,
    "3. Include this body section:",
    "## Test plan",
    "- [ ] <commands or checks run>",
    "4. Run:",
    "```bash",
    'gh pr create --title "<type>: <summary>" --body-file <pr-body.md>',
    "```",
    `5. After GitHub returns the PR URL, post the PR link on issue #${issue}.`,
  ].join("\n");
}

export function formatRouterOutput(yaml: string, agent: string | null, workflow: string[]): string {
  const lines = [yaml, ""];

  if (agent) {
    lines.push(formatNextLine(agent));
    lines.push(formatWorkflowLine(workflow));
  } else {
    lines.push(formatEscalationMessage(null));
  }

  return lines.join("\n");
}
