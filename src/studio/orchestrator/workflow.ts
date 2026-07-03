import type {
  ExecutionHandoff,
  Handoff,
  HandoffType,
  ReviewHandoff,
  RouterHandoff,
  WorkflowResult,
} from "./types";
import {
  formatEscalationMessage,
  formatNextLine,
  formatPrCreatorInstructions,
  formatWorkflowLine,
} from "./prompts";

export function getWorkflowStage(handoffType: HandoffType, handoff: Handoff): string {
  switch (handoffType) {
    case "router": {
      const router = handoff as RouterHandoff;
      if (router.escalate) return "escalated";
      return `routed-to-${router.agent}`;
    }
    case "execution":
      return "awaiting-review";
    case "review": {
      const review = handoff as ReviewHandoff;
      if (review.next_agent === "pr-creator-agent") return "ready-for-pr";
      return "review-loop";
    }
    default: {
      const _exhaustive: never = handoffType;
      return _exhaustive;
    }
  }
}

export function getNextStep(handoffType: HandoffType, handoff: Handoff): WorkflowResult {
  const workflowStage = getWorkflowStage(handoffType, handoff);

  switch (handoffType) {
    case "router": {
      const router = handoff as RouterHandoff;
      if (router.escalate || router.agent === null) {
        return {
          nextAgent: null,
          nextPrompt: formatEscalationMessage(router.recommendation),
          workflowStage,
          escalate: true,
        };
      }

      const workflow = router.workflow.length > 0
        ? router.workflow
        : [router.agent, "review-agent", "pr-creator-agent"];

      return {
        nextAgent: router.agent,
        nextPrompt: [
          formatNextLine(router.agent),
          formatWorkflowLine(workflow),
        ].join("\n"),
        workflowStage,
        escalate: false,
      };
    }

    case "execution": {
      const execution = handoff as ExecutionHandoff;
      const nextAgent = execution.next_agent || "review-agent";

      return {
        nextAgent,
        nextPrompt: [
          formatNextLine(nextAgent),
          formatWorkflowLine([execution.source_agent, "review-agent", "pr-creator-agent"]),
        ].join("\n"),
        workflowStage,
      };
    }

    case "review": {
      const review = handoff as ReviewHandoff;
      const nextAgent = review.next_agent;

      if (review.verdict === "approved" && nextAgent === "pr-creator-agent") {
        return {
          nextAgent,
          nextPrompt: formatPrCreatorInstructions(review.issue),
          workflowStage,
        };
      }

      const workflow =
        nextAgent === "pr-creator-agent"
          ? ["review-agent", "pr-creator-agent"]
          : [nextAgent, "review-agent", "pr-creator-agent"];

      return {
        nextAgent,
        nextPrompt: [
          formatNextLine(nextAgent),
          formatWorkflowLine(workflow),
        ].join("\n"),
        workflowStage,
      };
    }

    default: {
      const _exhaustive: never = handoffType;
      throw new Error(`Unknown handoff type: ${_exhaustive}`);
    }
  }
}
