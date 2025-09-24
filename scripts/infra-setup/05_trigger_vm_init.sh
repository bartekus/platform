#!/usr/bin/env bash
set -euo pipefail
source ./scripts/infra-setup/env.sh

GH_REPO="$GITHUB_REPO"
wf_path="${WORKFLOW_FILE:-.github/workflows/vm_init.yml}"
wf_base="$(basename "$wf_path")"
swap() { [[ "$1" == *"-"* ]] && echo "${1//-/_}" || echo "${1//_/-}"; }
wf_base_alt="$(swap "$wf_base")"

echo "🚀 Resolving workflow… (repo=$GH_REPO, branch=$BRANCH)"
workflows_json="$(gh workflow list --repo "$GH_REPO" --all --json id,name,path,state)"

pick_id() {
  local f="$1"
  jq -r "$f" <<<"$workflows_json" | head -n1
}

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
  echo "❌ Could not resolve workflow for '$wf_path'/'$wf_base'/'$wf_base_alt'."
  echo "$workflows_json" | jq -r '.[] | "\(.id)\t\(.name)\t\(.path)\t\(.state)"'
  exit 1
fi

echo "✅ Workflow ID: $WF_ID"
echo "🚀 Triggering on branch '$BRANCH'…"
host_arg="${HOST:-}"
user_arg="${SERVER_USER:-}"

# Send inputs along with the dispatch
gh workflow run "$WF_ID" --repo "$GH_REPO" --ref "$BRANCH" \
  -f droplet_ip="${DROPLET_IP:-}" \
  -f droplet_ipv6="${DROPLET_IPV6:-}" \
  -f host="${host_arg}" \
  -f user="${user_arg}" >/dev/null

# Poll for the NEW run that is queued|in_progress to avoid grabbing a previous failed run.
echo "🔎 Waiting for the new run to register…"
RUN_ID=""
for i in {1..30}; do
  # Filter runs for this workflow & branch, newest first, pick the first not-completed
  RUN_ID="$(gh api repos/$GH_REPO/actions/workflows/$WF_ID/runs \
    -q '.workflow_runs[] | select(.head_branch=="'"$BRANCH"'") | select(.status!="completed") | .id' \
    | head -n1 || true)"
  if [[ -n "$RUN_ID" ]]; then
    break
  fi
  sleep 2
done

# Fallback: last run if still not found (very rare)
if [[ -z "${RUN_ID:-}" ]]; then
  RUN_ID="$(gh run list --repo "$GH_REPO" --workflow "$WF_ID" --branch "$BRANCH" --limit 1 --json databaseId \
    | jq -r '.[0].databaseId')"
fi

if [[ -z "${RUN_ID:-}" || "$RUN_ID" == "null" ]]; then
  echo "⚠️  Could not determine run id. Check Actions UI."
  exit 1
fi

echo "⌛ Watching run #${RUN_ID}…"
gh run watch "$RUN_ID" --repo "$GH_REPO" --exit-status