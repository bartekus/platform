#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh

GH_REPO="$GITHUB_REPO"

# Build candidate names from WORKFLOW_FILE
wf_path="$WORKFLOW_FILE"
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

echo "🚀 Resolving workflow…"
echo "   repo: $GH_REPO"
echo "   branch: $BRANCH"
echo "   target: $WORKFLOW_FILE (candidates: '$wf_path', '$wf_base', '$wf_base_alt')"

# Fetch all workflows (name, path, id)
workflows_json="$(gh workflow list --repo "$GH_REPO" --all --json id,name,path,state)"

# jq filters to try (ordered)
jq_filters=(
  ".[] | select(.path == \"$wf_path\") | .id"
  ".[] | select(.path | endswith(\"/$wf_base\")) | .id"
  ".[] | select(.name == \"$wf_base\") | .id"
  ".[] | select(.name == \"$wf_base_alt\") | .id"
  ".[] | select(.path | endswith(\"/$wf_base_alt\")) | .id"
)

WF_ID=""
for f in "${jq_filters[@]}"; do
  id="$(jq -r "$f" <<<"$workflows_json" | head -n1)"
  if [[ -n "$id" && "$id" != "null" ]]; then
    WF_ID="$id"
    break
  fi
done

if [[ -z "$WF_ID" ]]; then
  echo "❌ Could not find a workflow matching:"
  echo "   - $wf_path"
  echo "   - $wf_base"
  echo "   - $wf_base_alt"
  echo ""
  echo "📋 Workflows found in $GH_REPO:"
  echo "$workflows_json" | jq -r '.[] | "\(.id)\t\(.name)\t\(.path)\t\(.state)"'
  echo ""
  echo "💡 Fix:"
  echo "  • Ensure the file is pushed to the remote branch '$BRANCH'."
  echo "  • Set WORKFLOW_FILE exactly to the path or basename (e.g., '.github/workflows/vm_init.yml')."
  exit 1
fi

echo "✅ Resolved workflow ID: $WF_ID"

echo "🚀 Triggering workflow on branch '${BRANCH}'..."
gh workflow run "$WF_ID" --repo "$GH_REPO" --ref "$BRANCH" >/dev/null

# Grab the newest run for this workflow & branch
RUN_ID="$(gh run list --repo "$GH_REPO" --workflow "$WF_ID" --branch "$BRANCH" --limit 1 --json databaseId \
  | jq -r '.[0].databaseId')"

if [[ -z "${RUN_ID:-}" || "$RUN_ID" == "null" ]]; then
  echo "⚠️  Could not determine run id. Check GitHub Actions in the repo."
  exit 1
fi

echo "⌛ Watching run #${RUN_ID}…"
gh run watch "$RUN_ID" --repo "$GH_REPO" --exit-status
