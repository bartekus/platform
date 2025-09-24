#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh

# Prefer addressing the workflow by filename; it's more reliable than the display name.
WORKFLOW_FILE="${WORKFLOW_FILE:-.github/workflows/vm-init.yml}"
echo "🚀 Triggering '$WORKFLOW_FILE' on branch '${BRANCH}'..."

gh workflow run "$WORKFLOW_FILE" --repo "$GITHUB_REPO" --ref "$BRANCH" >/tmp/_gh_run_out.txt

# Extract the run id by listing recent runs of this workflow
RUN_ID=$(gh run list --repo "$GITHUB_REPO" --workflow "$WORKFLOW_FILE" --branch "$BRANCH" --limit 1 --json databaseId --jq '.[0].databaseId')

if [[ -z "${RUN_ID:-}" ]]; then
  echo "❌ Could not determine run id. Check GitHub Actions."
  exit 1
fi

echo "⌛ Watching run #${RUN_ID}..."
gh run watch "$RUN_ID" --repo "$GITHUB_REPO" --exit-status