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
