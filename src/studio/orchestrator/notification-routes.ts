export type NotificationRouteKey =
  | "dispatch"
  | "research"
  | "project"
  | "feature"
  | "bug"
  | "docs"
  | "test"
  | "ui"
  | "review"
  | "merge"
  | "author";

export interface NotificationRouteInput {
  label: string;
  labels: string[];
}

const DIRECT_ROUTES: Record<string, NotificationRouteKey[]> = {
  "router-ready": ["dispatch"],
  "needs-research": ["research"],
  epic: ["project", "author"],
  "ready-for-review": ["review"],
  "approved-for-merge": ["merge", "author"],
  "needs-human": ["author"],
};

const AGENT_ROUTES: Record<string, NotificationRouteKey> = {
  "agent:feature": "feature",
  "agent:bug": "bug",
  "agent:docs": "docs",
  "agent:test": "test",
  "agent:design": "ui",
};

function uniqueRoutes(routes: NotificationRouteKey[]): NotificationRouteKey[] {
  return [...new Set(routes)];
}

export function resolveNotificationRoutes(input: NotificationRouteInput): NotificationRouteKey[] {
  if (input.label === "ready-for-execution") {
    const agentLabel = input.labels.find((name) => name.startsWith("agent:"));
    const route = agentLabel ? AGENT_ROUTES[agentLabel] : undefined;
    return route ? [route] : [];
  }

  return uniqueRoutes(DIRECT_ROUTES[input.label] ?? []);
}
