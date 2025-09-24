#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh

GH_REPO="$GITHUB_REPO"
wf_path="${DEPLOY_WORKFLOW_FILE:-.github/workflows/deploy.yml}"
wf_base="$(basename "$wf_path")"

swap_hyphen_underscore() {
  local s="$1"
  if [[ "$s" == *"-"* ]]; then
    echo "${s//-/_}"
  else
    echo "${s//_/-}"
  fi
}
wf_base_alt="$(swap_hyphen_underscore "$wf_base")"

echo "🚀 Resolving deploy workflow… (repo=$GH_REPO, branch=$BRANCH)"
workflows_json="$(gh workflow list --repo "$GH_REPO" --all --json id,name,path,state)"

pick_id() { jq -r "$1" <<<"$workflows_json" | head -n1; }

WF_ID=""
for f in \
  ".[] | select(.path == \"$wf_path\") | .id" \
  ".[] | select(.path | endswith(\"/$wf_base\")) | .id" \
  ".[] | select(.name == \"$wf_base\") | .id" \
  ".[] | select(.name == \"$wf_base_alt\") | .id" \
  ".[] | select(.path | endswith(\"/$wf_base_alt\")) | .id"
do
  WF_ID="$(pick_id "$f")"
  [[ -n "$WF_ID" && "$WF_ID" != "null" ]] && break
done

if [[ -z "${WF_ID:-}" || "$WF_ID" == "null" ]]; then
  echo "❌ Could not find a deploy workflow matching:"
  echo "   - $wf_path"
  echo "   - $wf_base"
  echo "   - $wf_base_alt"
  echo ""
  echo "📋 Workflows in $GH_REPO:"
  echo "$workflows_json" | jq -r '.[] | "\(.id)\t\(.name)\t\(.path)\t\(.state)"'
  exit 1
fi

echo "✅ Deploy workflow ID: $WF_ID"

echo "🚀 Triggering deploy on branch '${BRANCH}'…"
# deploy.yml already has `on: workflow_dispatch` with no required inputs
gh workflow run "$WF_ID" --repo "$GH_REPO" --ref "$BRANCH" >/dev/null

# Poll for the new run that's actually from this dispatch and not completed yet
echo "🔎 Waiting for the new deploy run to register…"
RUN_ID=""
for i in {1..30}; do
  RUN_ID="$(gh api repos/$GH_REPO/actions/workflows/$WF_ID/runs \
    -q '.workflow_runs[]
        | select(.head_branch=="'"$BRANCH"'")
        | select(.event=="workflow_dispatch")
        | select(.status!="completed")
        | .id' \
    | head -n1 || true)"
  [[ -n "$RUN_ID" ]] && break
  sleep 2
done

# Fallback—grab the latest run if we missed the window
if [[ -z "${RUN_ID:-}" ]]; then
  RUN_ID="$(gh run list --repo "$GH_REPO" --workflow "$WF_ID" --branch "$BRANCH" --limit 1 --json databaseId \
    | jq -r '.[0].databaseId')"
fi

if [[ -z "${RUN_ID:-}" || "$RUN_ID" == "null" ]]; then
  echo "⚠️  Could not determine deploy run id. Check Actions UI."
  exit 1
fi

echo "⌛ Watching deploy run #${RUN_ID}…"
gh run watch "$RUN_ID" --repo "$GH_REPO" --exit-status
