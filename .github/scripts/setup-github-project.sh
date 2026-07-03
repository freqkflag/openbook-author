#!/usr/bin/env bash
# Creates GitHub Project v2 board and adds all openbook-author issues.
# Requires: gh auth refresh -s project,read:project
set -euo pipefail
REPO="freqkflag/openbook-author"
OWNER="freqkflag"

echo "Creating GitHub Project..."
PROJECT_JSON=$(gh api graphql -f query='
mutation($ownerId: ID!, $title: String!) {
  createProjectV2(input: {ownerId: $ownerId, title: $title}) {
    projectV2 { id url number title }
  }
}' -f ownerId="U_kgDOC04keg" -f title="OpenBook Author Roadmap")

PROJECT_ID=$(echo "$PROJECT_JSON" | jq -r '.data.createProjectV2.projectV2.id')
PROJECT_URL=$(echo "$PROJECT_JSON" | jq -r '.data.createProjectV2.projectV2.url')
echo "Project: $PROJECT_URL"

echo "Linking repository..."
gh api graphql -f query='
mutation($projectId: ID!, $repoId: ID!) {
  linkProjectV2ToRepository(input: {projectId: $projectId, repositoryId: $repoId}) {
    repository { name }
  }
}' -f projectId="$PROJECT_ID" -f repoId="$(gh api repos/$OWNER/$REPO --jq .node_id)"

echo "Adding issues to project..."
gh issue list --repo "$OWNER/$REPO" --state all --limit 100 --json id,number,title | jq -c '.[]' | while read -r issue; do
  ISSUE_ID=$(echo "$issue" | jq -r .id)
  NUM=$(echo "$issue" | jq -r .number)
  gh api graphql -f query='
  mutation($projectId: ID!, $contentId: ID!) {
    addProjectV2ItemById(input: {projectId: $projectId, contentId: $contentId}) {
      item { id }
    }
  }' -f projectId="$PROJECT_ID" -f contentId="$ISSUE_ID" >/dev/null
  echo "  Added #$NUM"
done

echo ""
echo "Done! Open your project board:"
echo "  $PROJECT_URL"
echo ""
echo "Suggested board views:"
echo "  - Group by Milestone (v0.2–v0.5)"
echo "  - Group by Status (open vs closed)"
echo "  - Filter priority:high for next sprint"
