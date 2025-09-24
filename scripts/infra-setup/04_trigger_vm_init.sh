#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh

WORKFLOW_NAME="VM Initialization"
echo "🚀 Triggering '${WORKFLOW_NAME}' on branch '${BRANCH}'..."

# TODO: Fix this
#OUTPUT=$(gh workflow run "$WORKFLOW_NAME" --repo "$GITHUB_REPO" --ref "$BRANCH")
#RUN_URL=$(echo "$OUTPUT" | sed -n '2p')
#RUN_ID="${RUN_URL##*/}"
#
#echo "⌛ Watching run #${RUN_ID}..."
#gh run watch "$RUN_ID" --repo "$GITHUB_REPO"