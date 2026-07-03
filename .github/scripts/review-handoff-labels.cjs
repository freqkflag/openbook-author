const AGENT_LABEL = Object.freeze({
  "debug-agent": "agent:bug",
  "feature-agent": "agent:feature",
  "docs-agent": "agent:docs",
  "refactor-agent": "agent:refactor",
  "test-agent": "agent:test",
  "ui-agent": "agent:design",
});

const VALID_REVIEW_VERDICTS = new Set(["approved", "changes_requested", "blocked"]);

function extractYamlPayload(body) {
  const yamlMatch = body.match(/```ya?ml\s*([\s\S]*?)```/);
  return (yamlMatch?.[1] ?? body).trim();
}

function readScalar(raw, field) {
  const match = raw.match(new RegExp(`^${field}:\\s*["']?([^"'\\s#]+)`, "m"));
  return match?.[1] ?? "";
}

function parseReviewFields(body) {
  const raw = extractYamlPayload(body);
  return {
    raw,
    verdict: readScalar(raw, "verdict"),
    nextAgent: readScalar(raw, "next_agent"),
  };
}

function getReviewLabelPlan({ verdict, nextAgent }) {
  if (!VALID_REVIEW_VERDICTS.has(verdict)) {
    return { labelsToAdd: [], labelsToRemove: [] };
  }

  const labelsToAdd = [];
  const labelsToRemove = ["ready-for-review"];

  if (verdict === "approved") {
    labelsToAdd.push("approved-for-merge");
    labelsToRemove.push("needs-rework", "needs-human", "ready-for-execution");
  } else {
    labelsToAdd.push("needs-rework");
    labelsToRemove.push("approved-for-merge", "needs-human");
    if (AGENT_LABEL[nextAgent]) {
      labelsToAdd.push(AGENT_LABEL[nextAgent], "ready-for-execution");
    }
  }

  return { labelsToAdd, labelsToRemove };
}

module.exports = {
  AGENT_LABEL,
  extractYamlPayload,
  getReviewLabelPlan,
  parseReviewFields,
};
