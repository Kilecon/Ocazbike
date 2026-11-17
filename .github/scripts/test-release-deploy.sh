#!/usr/bin/env bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
temporary=$(mktemp -d)
cleanup() {
  rm -f "$temporary/commands" "$temporary/output"
  rmdir "$temporary"
}
trap cleanup EXIT

deployment_script=$(sed -n '/^          script: |$/,$p' "$ROOT/.github/workflows/deploy-release.yml" |
  sed '1d;s/^            //')
[[ -n "$deployment_script" ]]
export VPS_DIR="$temporary" DEPLOY_SHA=test-commit
export COMMAND_LOG="$temporary/commands"

record_step() {
  printf '%s\n' "$1" >> "$COMMAND_LOG"
  if [[ "$FAIL_STEP" == "$1" ]]; then
    printf 'Simulated failure: %s\n' "$1" >&2
    return 1
  fi
}
id() {
  printf '1002\n'
}
git() {
  case "$1" in
    status) return 0 ;;
    fetch) record_step fetch ;;
    merge-base) record_step ancestry ;;
    switch) record_step checkout ;;
    *) return 2 ;;
  esac
}
bash() {
  [[ "$1" == infra/scripts/init-release-secrets.sh ]] || return 2
  record_step secrets
}
docker() {
  record_step "$6"
}
export -f record_step id git bash docker

steps=(fetch ancestry checkout secrets config build up ps)
expected=""
for step in "${steps[@]}"; do
  expected+="${step}"$'\n'
  export FAIL_STEP="$step"
  : > "$COMMAND_LOG"
  if /bin/bash -c "$deployment_script" > "$temporary/output" 2>&1; then
    echo "Deployment incorrectly succeeded after failure at $step." >&2
    exit 1
  fi
  [[ "$(cat "$COMMAND_LOG")" == "${expected%$'\n'}" ]]
  if grep -Fq 'Deployment completed.' "$temporary/output"; then
    echo "Deployment reported success after failure at $step." >&2
    exit 1
  fi
done

export FAIL_STEP=""
: > "$COMMAND_LOG"
/bin/bash -c "$deployment_script" > "$temporary/output" 2>&1
[[ "$(cat "$COMMAND_LOG")" == "${expected%$'\n'}" ]]
grep -Fxq 'Deployment completed.' "$temporary/output"
echo "Release deployment tests passed: stop on failure at every stage, success only after all stages."
