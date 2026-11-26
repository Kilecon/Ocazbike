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
    "$temporary/infra/docker/tempo.yaml" \
    "$temporary/data/release/status" "$temporary/data/release/lock" \
    "$temporary/data/release/manage-release.sh"
  rmdir "$temporary/data/release" "$temporary/data" "$temporary/da" "$temporary/infra/docker" "$temporary/infra"
  rmdir "$temporary"
}
trap cleanup EXIT
mkdir -p "$temporary/da" "$temporary/data/release" "$temporary/infra/docker"
install -m 700 "$ROOT/infra/docker/tempo.yaml" "$temporary/infra/docker/tempo.yaml"

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
  local step=$1
  printf '%s\n' "$step" >> "$COMMAND_LOG"
  if [[ "$FAIL_STEP" == "$step" ]]; then
    printf 'Simulated failure: %s\n' "$step" >&2
    return 1
  fi
}
id() {
  printf '1002\n'
}
git() {
  local command=$1
  case "$command" in
    rev-parse) printf '%s\n' "$VPS_DIR" ;;
    status) return 0 ;;
    fetch) record_step fetch ;;
    merge-base) record_step ancestry ;;
    show)
      local object=$2
      case "$object" in
        *:infra/scripts/manage-release.sh) cat "$ROOT/infra/scripts/manage-release.sh" ;;
        *:infra/compose.release.yaml) cat "$ROOT/infra/compose.release.yaml" ;;
        *) return 2 ;;
      esac ;;
    switch)
      local mode=$2 revision=$3
      [[ "$mode" == --detach && "$revision" =~ ^[0-9a-f]{40}$ && "$(umask)" == 0022 ]] || return 2
      record_step checkout ;;
    *) return 2 ;;
  esac
}
bash() {
  local script=$1
  case "$script" in
    infra/scripts/init-release-secrets.sh)
      record_step secrets || return 1
      printf 'SPA_APP_ID=%s\n' "$DEPLOY_SHA" > da/.env ;;
    infra/scripts/start-falco.sh) record_step falco ;;
    *)
      local action=$2
      [[ "$action" == deploy ]] && /bin/bash "$@" ;;
  esac
}
docker() {
  local command=$1 subcommand=$2
  case "$command $subcommand" in
    'login ghcr.io')
      local token user_flag=$3 username=$4 password_flag=$5
      read -r token
      [[ "$token" == test-token && "$user_flag $username $password_flag" == '-u test-user --password-stdin' ]] || return 2
      record_step login ;;
    'logout ghcr.io') record_step logout ;;
    'image inspect')
      local api_image=$3 spa_image=$4 garage_image=$5
      [[ "$api_image $spa_image $garage_image" == "$RELEASE_API_IMAGE $RELEASE_SPA_IMAGE $RELEASE_GARAGE_IMAGE" ]] || return 2
      record_step inspect ;;
    'image tag')
      local source_image=$3 tagged_image=$4
      local target=${tagged_image%:sha-test-commit-123-2}
      [[ "$tagged_image" == "$target:sha-test-commit-123-2" && "$target" == ghcr.io/example/ocazbike-* &&
        "$source_image" == "ocazbike-${target##*-}:release" ]] || return 2
      record_step "tag-${target##*-}" ;;
    'image push')
      local tagged_image=$3
      local target=${tagged_image%:sha-test-commit-123-2}
      record_step "push-${target##*-}" || return 1
      if [[ ${BAD_DIGEST:-} == "${target##*-}" ]]; then
        printf 'sha-test-commit-123-2: digest: invalid size: 1\n'
      else
        printf 'sha-test-commit-123-2: digest: %s size: 1\n' "$TEST_DIGEST"
      fi ;;
    'compose -p')
      local project_option=$4
      if [[ "$project_option" == --project-directory ]]; then
        local action=${10} policy_flag=${11} policy=${12}
        [[ "$action $policy_flag $policy" == 'pull --policy missing' ]] || return 2
        record_step pull
      else
        local action=$8
        case "$action" in
          config)
            local quiet_flag=$9
            [[ "$quiet_flag" == --quiet ]] || return 2 ;;
          up)
            local build_flag=$9 pull_flag=${10} pull_policy=${11}
            [[ "$build_flag $pull_flag $pull_policy" == '--no-build --pull never' &&
              "$(stat -c %a infra/docker/tempo.yaml)" == 744 &&
              "$(stat -c %a data/release/status)" == 600 ]] || return 2 ;;
          ps) ;;
          *) return 2 ;;
        esac
        record_step "$action"
      fi ;;
    'volume inspect')
      local volume=$3
      [[ "$volume" == infra_sqlite-data ]] ;;
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
chmod 700 "$temporary/infra/docker/tempo.yaml"
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
