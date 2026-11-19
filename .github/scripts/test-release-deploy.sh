#!/usr/bin/env bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
temporary=$(mktemp -d)
cleanup() {
  local snapshot
  for snapshot in "$temporary/data/release"/release.*; do
    [[ -d "$snapshot" ]] || continue
    rm -f -- "$snapshot/manifest" "$snapshot/env"
    rmdir -- "$snapshot"
  done
  rm -f "$temporary/commands" "$temporary/output" "$temporary/deploy.sh" \
    "$temporary/publish.sh" "$temporary/images" "$temporary/da/.env" \
    "$temporary/data/release/status" "$temporary/data/release/lock" \
    "$temporary/data/release/manage-release.sh"
  rmdir "$temporary/data/release" "$temporary/data" "$temporary/da"
  rmdir "$temporary"
}
trap cleanup EXIT
mkdir -p "$temporary/da" "$temporary/data/release"

sed -n '/^          script: |$/,$p' "$ROOT/.github/workflows/deploy-release.yml" |
  sed '1d;s/^            //' > "$temporary/deploy.sh"
[[ -s "$temporary/deploy.sh" ]]
sed -n '/^      - name: Publish release images to GHCR$/,/^      - name: Prepare release secrets$/p' \
  "$ROOT/.github/workflows/deploy-release.yml" |
  sed -n '/^        run: |$/,$s/^          //p' > "$temporary/publish.sh"
[[ -s "$temporary/publish.sh" ]]
printf -v DEPLOY_SHA '%040d' 1
export VPS_DIR="$temporary" DEPLOY_SHA ROOT
export COMMAND_LOG="$temporary/commands"
export DEPLOY_FALCO=true
export GITHUB_REPOSITORY=Example/Ocazbike GITHUB_ACTOR=test-user GITHUB_SHA=test-commit \
  GITHUB_RUN_ID=123 GITHUB_RUN_ATTEMPT=2
export GHCR_TOKEN=test-token GITHUB_OUTPUT="$temporary/images"
printf -v TEST_DIGEST 'sha256:%064d' 1
export TEST_DIGEST

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
    rev-parse) printf '%s\n' "$VPS_DIR" ;;
    status) return 0 ;;
    fetch) record_step fetch ;;
    merge-base) record_step ancestry ;;
    show)
      case "$2" in
        *:infra/scripts/manage-release.sh) cat "$ROOT/infra/scripts/manage-release.sh" ;;
        *:infra/compose.release.yaml) cat "$ROOT/infra/compose.release.yaml" ;;
        *) return 2 ;;
      esac ;;
    switch)
      [[ "$2" == --detach && "$3" =~ ^[0-9a-f]{40}$ ]] || return 2
      record_step checkout ;;
    *) return 2 ;;
  esac
}
bash() {
  case "$1" in
    infra/scripts/init-release-secrets.sh)
      record_step secrets || return 1
      printf 'SPA_APP_ID=%s\n' "$DEPLOY_SHA" > da/.env ;;
    infra/scripts/start-falco.sh) record_step falco ;;
    *) [[ "$2" == deploy ]] && /bin/bash "$@" ;;
  esac
}
docker() {
  case "$1 $2" in
    'login ghcr.io')
      local token
      read -r token
      [[ "$token" == test-token && "$3 $4 $5" == '-u test-user --password-stdin' ]] || return 2
      record_step login ;;
    'logout ghcr.io') record_step logout ;;
    'image inspect')
      [[ "$3 $4 $5" == "$RELEASE_API_IMAGE $RELEASE_SPA_IMAGE $RELEASE_GARAGE_IMAGE" ]] || return 2
      record_step inspect ;;
    'image tag')
      local target=${4%:sha-test-commit-123-2}
      [[ "$4" == "$target:sha-test-commit-123-2" && "$target" == ghcr.io/example/ocazbike-* &&
        "$3" == "ocazbike-${target##*-}:release" ]] || return 2
      record_step "tag-${target##*-}" ;;
    'image push')
      local target=${3%:sha-test-commit-123-2}
      record_step "push-${target##*-}" || return 1
      if [[ ${BAD_DIGEST:-} == "${target##*-}" ]]; then
        printf 'sha-test-commit-123-2: digest: invalid size: 1\n'
      else
        printf 'sha-test-commit-123-2: digest: %s size: 1\n' "$TEST_DIGEST"
      fi ;;
    'compose -p')
      if [[ "$4" == --project-directory ]]; then
        [[ "${10} ${11} ${12}" == 'pull --policy missing' ]] || return 2
        record_step pull
      else
        case "$8" in
          config) [[ "$9" == --quiet ]] || return 2 ;;
          up) [[ "$9 ${10} ${11}" == '--no-build --pull never' ]] || return 2 ;;
          ps) ;;
          *) return 2 ;;
        esac
        record_step "$8"
      fi ;;
    'volume inspect') [[ "$3" == infra_sqlite-data ]] ;;
    'run --rm')
      [[ " $* " == *' type=volume,source=infra_sqlite-data,target=/data,readonly '* ]] || return 2
      record_step schema || return 1
      printf '%064d\n' "${SCHEMA_VERSION:-1}" ;;
    *) return 2 ;;
  esac
}
export -f record_step id git bash docker

export FAIL_STEP=""
: > "$COMMAND_LOG"
/bin/bash -eo pipefail "$temporary/publish.sh" > "$temporary/output" 2>&1
[[ "$(cat "$COMMAND_LOG")" == $'login\ntag-api\npush-api\ntag-spa\npush-spa\ntag-garage\npush-garage\nlogout' ]]
diff -u <(printf '%s=ghcr.io/example/ocazbike-%s@%s\n' \
  api api "$TEST_DIGEST" spa spa "$TEST_DIGEST" garage garage "$TEST_DIGEST") "$GITHUB_OUTPUT"

IFS= read -r api < "$GITHUB_OUTPUT"
spa=$(sed -n '2p' "$GITHUB_OUTPUT")
garage=$(sed -n '3p' "$GITHUB_OUTPUT")
export RELEASE_API_IMAGE=${api#api=} RELEASE_SPA_IMAGE=${spa#spa=} RELEASE_GARAGE_IMAGE=${garage#garage=}

: > "$COMMAND_LOG"
: > "$GITHUB_OUTPUT"
if BAD_DIGEST=api /bin/bash -eo pipefail "$temporary/publish.sh" > "$temporary/output" 2>&1; then
  echo "Publication accepted an invalid image digest." >&2
  exit 1
fi
[[ ! -s "$GITHUB_OUTPUT" ]]
[[ "$(cat "$COMMAND_LOG")" == $'login\ntag-api\npush-api\nlogout' ]]

: > "$COMMAND_LOG"
if RELEASE_GARAGE_IMAGE= /bin/bash "$temporary/deploy.sh" > "$temporary/output" 2>&1; then
  echo "Deployment accepted missing image references." >&2
  exit 1
fi
[[ ! -s "$COMMAND_LOG" ]]

steps=(fetch ancestry pull inspect checkout secrets config up ps schema falco)
expected=""
for step in "${steps[@]}"; do
  expected+="${step}"$'\n'
  export FAIL_STEP="$step"
  : > "$COMMAND_LOG"
  if /bin/bash "$temporary/deploy.sh" > "$temporary/output" 2>&1; then
    echo "Deployment incorrectly succeeded after failure at $step." >&2
    exit 1
  fi
  [[ "$(cat "$COMMAND_LOG")" == "${expected%$'\n'}" ]]
  if grep -Fq 'Deployment completed.' "$temporary/output"; then
    echo "Deployment reported success after failure at $step." >&2
    exit 1
  fi
done
grep -Fq 'The application is deployed, but Falco failed to start.' "$temporary/output"

export FAIL_STEP=""
: > "$COMMAND_LOG"
/bin/bash "$temporary/deploy.sh" > "$temporary/output" 2>&1
[[ "$(cat "$COMMAND_LOG")" == "${expected%$'\n'}" ]]
grep -Fxq 'Deployment completed.' "$temporary/output"

old_sha=$DEPLOY_SHA
printf -v DEPLOY_SHA '%040d' 2
: > "$COMMAND_LOG"
DEPLOY_FALCO=false FAIL_STEP=falco /bin/bash "$temporary/deploy.sh" > "$temporary/output" 2>&1
[[ "$(cat "$COMMAND_LOG")" == "${expected%$'\n'falco$'\n'}" ]]
grep -Fxq 'Falco deployment skipped for this release.' "$temporary/output"
grep -Fxq 'Deployment completed.' "$temporary/output"

: > "$COMMAND_LOG"
if SCHEMA_VERSION=2 /bin/bash "$temporary/data/release/manage-release.sh" rollback > "$temporary/output" 2>&1; then
  echo "Rollback accepted a changed SQLite schema." >&2
  exit 1
fi
[[ "$(cat "$COMMAND_LOG")" == $'pull\ninspect\nschema' ]]
grep -Fq 'SQLite schema or migration history changed' "$temporary/output"

: > "$COMMAND_LOG"
/bin/bash "$temporary/data/release/manage-release.sh" rollback > "$temporary/output" 2>&1
[[ "$(cat "$COMMAND_LOG")" == $'pull\ninspect\nschema\ncheckout\nconfig\nup\nps\nschema' ]]
[[ "$(cat "$temporary/da/.env")" == "SPA_APP_ID=$old_sha" ]]
grep -Fxq 'Rollback completed without overwriting SQLite or release secrets.' "$temporary/output"

# Failed deployments leave the last healthy release as the recovery target.
: > "$COMMAND_LOG"
if FAIL_STEP=up /bin/bash "$temporary/deploy.sh" > "$temporary/output" 2>&1; then
  echo "Deployment ignored a failed Compose startup." >&2
  exit 1
fi
/bin/bash "$temporary/data/release/manage-release.sh" rollback > "$temporary/output" 2>&1
[[ "$(cat "$temporary/da/.env")" == "SPA_APP_ID=$old_sha" ]]
echo "Release deployment tests passed: digest publication, ordered deployment, and schema-safe rollback."
