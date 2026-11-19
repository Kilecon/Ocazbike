#!/usr/bin/env bash
set -euo pipefail
umask 077

fail() { printf 'Release: %s\n' "$*" >&2; exit 1; }

cd "$(git rev-parse --show-toplevel)"
state="$PWD/data/release"
mkdir -p "$state"
chmod 700 "$state"
exec 9>"$state/lock"
flock -n 9 || fail "Another deployment or rollback is running."
[[ -z "$(git status --porcelain --untracked-files=no)" ]] || fail "Tracked files have local changes."

current=-
previous=-
pending=no
if [[ -f "$state/status" ]]; then
  mapfile -t status < "$state/status"
  [[ "${#status[@]}" == 3 && "${status[0]}" =~ ^(-|release\.[[:alnum:]]+)$ &&
     "${status[1]}" =~ ^(-|release\.[[:alnum:]]+)$ &&
     "${status[2]}" =~ ^(yes|no)$ ]] || fail "Invalid release state."
  current=${status[0]} previous=${status[1]} pending=${status[2]}
fi

work=$(mktemp -d "$state/work.XXXXXXXX")
env_file=
cleanup() {
  if [[ -n "$env_file" ]]; then rm -f -- "$env_file"; fi
  rm -f -- "$work/compose.yaml" "$work/status" "$work/manage-release.sh"
  rmdir -- "$work"
}
trap cleanup EXIT

save_status() {
  printf '%s\n' "$@" > "$work/status"
  mv -f -- "$work/status" "$state/status"
}

validate_target() {
  [[ "$DEPLOY_SHA" =~ ^[0-9a-f]{40}$ ]] || fail "Invalid release commit."
  local image
  for image in "$RELEASE_API_IMAGE" "$RELEASE_SPA_IMAGE" "$RELEASE_GARAGE_IMAGE"; do
    [[ "$image" =~ ^ghcr\.io/[a-z0-9._/-]+@sha256:[0-9a-f]{64}$ ]] ||
      fail "All application images must be GHCR digests."
  done
  export RELEASE_API_IMAGE RELEASE_SPA_IMAGE RELEASE_GARAGE_IMAGE
}

compose() {
  docker compose -p infra --env-file da/.env -f infra/compose.release.yaml "$@"
}

pull_target() {
  # Resolve relative mounts as in the actual deployment, without switching the live checkout.
  git show "$DEPLOY_SHA:infra/compose.release.yaml" > "$work/compose.yaml"
  docker compose -p infra --project-directory "$PWD/infra" --env-file /dev/null \
    -f "$work/compose.yaml" pull --policy missing
  docker image inspect "$RELEASE_API_IMAGE" "$RELEASE_SPA_IMAGE" "$RELEASE_GARAGE_IMAGE" >/dev/null
}

schema_fingerprint() {
  docker volume inspect infra_sqlite-data >/dev/null
  docker run --rm --network none --read-only --cap-drop ALL \
    --security-opt no-new-privileges --user 10001:10001 \
    --mount type=volume,source=infra_sqlite-data,target=/data,readonly \
    --entrypoint bun "$RELEASE_API_IMAGE" -e '
      const { Database } = require("bun:sqlite");
      const { createHash } = require("node:crypto");
      const db = new Database("/data/elysia.sqlite", { readonly: true });
      db.exec("PRAGMA busy_timeout = 5000; BEGIN");
      const schema = db.query("SELECT type, name, tbl_name, sql FROM sqlite_schema ORDER BY type, name").all();
      const migrations = db.query("SELECT hash, created_at FROM __drizzle_migrations ORDER BY id").all();
      if (!migrations.length) throw new Error("Missing applied migrations");
      console.log(createHash("sha256").update(JSON.stringify([schema, migrations])).digest("hex"));
      db.close();
    '
}

checkout_target() {
  # Git may rewrite bind-mounted configs; keep the private umask for release state only.
  (umask 022; git switch --detach "$DEPLOY_SHA")
  # Repair checkouts where Git leaves the previously written Tempo file in place.
  chmod a+r -- infra/docker/tempo.yaml
}

up_target() {
  compose config --quiet
  compose up --no-build --pull never -d --force-recreate --remove-orphans --wait --wait-timeout 180
  compose ps
}

case "${1:-}" in
  deploy)
    validate_target
    pull_target

    install -m 700 -- "$0" "$work/manage-release.sh"
    mv -f -- "$work/manage-release.sh" "$state/manage-release.sh"
    save_status "$current" "$previous" yes
    checkout_target
    bash infra/scripts/init-release-secrets.sh
    up_target

    fingerprint=$(schema_fingerprint)
    [[ "$fingerprint" =~ ^[0-9a-f]{64}$ ]] || fail "Invalid SQLite fingerprint."
    snapshot=$(mktemp -d "$state/release.XXXXXXXX")
    printf '%s\n' "$DEPLOY_SHA" "$RELEASE_API_IMAGE" "$RELEASE_SPA_IMAGE" \
      "$RELEASE_GARAGE_IMAGE" "$fingerprint" > "$snapshot/manifest"
    cp -- da/.env "$snapshot/env"
    save_status "${snapshot##*/}" "$current" no

    if [[ "$DEPLOY_FALCO" == true ]]; then
      bash infra/scripts/start-falco.sh || fail "The application is deployed, but Falco failed to start."
    else
      echo "Falco deployment skipped for this release."
    fi
    echo "Deployment completed."
    ;;
  rollback)
    target=$previous
    [[ "$pending" == yes ]] && target=$current
    [[ "$target" != - ]] || fail "No verified release available for rollback."
    mapfile -t manifest < "$state/$target/manifest"
    [[ "${#manifest[@]}" == 5 && "${manifest[4]}" =~ ^[0-9a-f]{64}$ ]] ||
      fail "Invalid rollback manifest."
    DEPLOY_SHA=${manifest[0]} RELEASE_API_IMAGE=${manifest[1]}
    RELEASE_SPA_IMAGE=${manifest[2]} RELEASE_GARAGE_IMAGE=${manifest[3]}
    validate_target
    pull_target
    fingerprint=$(schema_fingerprint) || fail "Cannot verify the live SQLite database; nothing was restored."
    [[ "$fingerprint" == "${manifest[4]}" ]] ||
      fail "SQLite schema or migration history changed; rollback refused to preserve data."

    env_file=$(mktemp da/.env.rollback.XXXXXXXX)
    cp -- "$state/$target/env" "$env_file"
    save_status "$current" "$previous" yes
    checkout_target
    mv -f -- "$env_file" da/.env
    up_target
    [[ "$(schema_fingerprint)" == "${manifest[4]}" ]] ||
      fail "Could not confirm that SQLite stayed compatible after rollback."
    if [[ "$target" == "$current" ]]; then
      save_status "$current" "$previous" no
    else
      save_status "$target" "$current" no
    fi
    echo "Rollback completed without overwriting SQLite or release secrets."
    ;;
  *) fail "Usage: $0 deploy|rollback" ;;
esac
