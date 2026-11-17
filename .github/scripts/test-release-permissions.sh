#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
temporary=$(mktemp -d)
project="release-permissions-$(date +%s)-$$"
resources_created=false
secrets=(jwt_secret bootstrap_admin_password encryption_key discord_webhook_url \
  store_information_initial_data garage_rpc_secret garage_access_key garage_secret_key \
  garage_credentials grafana_user grafana_password)
compose() {
  docker compose -p "$project" --env-file "$temporary/env" -f "$temporary/compose.json" "$@"
}
cleanup() {
  if [[ "$resources_created" == true ]]; then
    compose down --volumes --remove-orphans
    for service in api spa garage; do docker image rm "ocazbike-$service:$project"; done
  fi
  for secret in "${secrets[@]}"; do rm -f "$temporary/$secret"; done
  rm -f "$temporary/env" "$temporary/compose.json" "$temporary/output"
  rmdir "$temporary"
}
trap cleanup EXIT

: > "$temporary/env"
for secret in "${secrets[@]}"; do : > "$temporary/$secret"; done
printf '01234567890123456789012345678901' > "$temporary/jwt_secret"
printf 'test-bootstrap-password' > "$temporary/bootstrap_admin_password"
printf '%064d' 0 > "$temporary/encryption_key"
printf 'test-garage-access' > "$temporary/garage_access_key"
printf 'test-garage-secret' > "$temporary/garage_secret_key"
printf '[default]\naws_access_key_id = test-garage-access\naws_secret_access_key = test-garage-secret\n' \
  > "$temporary/garage_credentials"
printf 'admin' > "$temporary/grafana_user"
printf 'test-password-long' > "$temporary/grafana_password"

# Render the real release config, isolating only images, host ports, logging and sources.
docker compose -p "$project" --env-file "$temporary/env" -f "$ROOT/infra/compose.release.yaml" config --format json |
  jq --arg directory "$temporary" --arg project "$project" '
    .secrets |= with_entries(.value.file = ($directory + "/" + .key)) |
    .networks.proxying = {internal: true} |
    .services |= with_entries(
      .value.logging = {driver: "local"} |
      .value.restart = "no" |
      del(.value.ports) |
      if .value.healthcheck and (.value.healthcheck.disable != true) then
        .value.healthcheck.interval = "2s" | .value.healthcheck.start_period = "1s"
      else . end
    ) |
    .services.api.image = ("ocazbike-api:" + $project) |
    .services.spa.image = ("ocazbike-spa:" + $project) |
    .services.garage.image = ("ocazbike-garage:" + $project) |
    .services."permissions-init".image = .services.garage.image
  ' > "$temporary/compose.json"
jq -e --arg prefix "${project}_" '
  ([.volumes[].name] + [.networks[] | select(.name != null) | .name]) |
  all(startswith($prefix))
' "$temporary/compose.json" >/dev/null
resources_created=true
compose build api spa garage

compose run --rm --no-deps --entrypoint /bin/sh permissions-init -ec '
  for directory in /data /var/lib/garage /var/tempo /loki /prometheus /var/lib/grafana; do
    mkdir -p "$directory/existing"
    printf preserved > "$directory/existing/sentinel"
    chown -R 0:0 "$directory"
    chmod 700 "$directory" "$directory/existing"
    chmod 600 "$directory/existing/sentinel"
  done
'
if compose up -d --wait --wait-timeout 30 garage > "$temporary/output" 2>&1; then
  echo "Garage started despite missing secrets." >&2
  exit 1
fi
[[ -z "$(compose ps --status running -q garage)" ]]
printf '%064d' 0 > "$temporary/garage_rpc_secret"
source_owners=$(for secret in "${secrets[@]}"; do stat -c '%u:%g:%a' "$temporary/$secret"; done)

check_secrets() {
  local service=$1 owner=$2 names=$3
  compose exec -T "$service" /bin/sh -ec '
    owner=$1
    shift
    test "$(stat -c %u:%g:%a /run/secrets)" = "$owner:$owner:700"
    test "$(ls -A /run/secrets | wc -l)" = "$#"
    for secret do
      test "$(stat -c %u:%g:%a "/run/secrets/$secret")" = "$owner:$owner:600"
      cat "/run/secrets/$secret" >/dev/null
    done
    if touch /run/secrets/write-check 2>/dev/null; then
      echo "Secrets volume is writable." >&2
      exit 1
    fi
  ' -- "$owner" $names
  compose exec -T --user 10003:10001 "$service" /bin/sh -ec '
    for secret do
      if cat "/run/secrets/$secret" >/dev/null 2>&1; then
        echo "Another service user could read a secret." >&2
        exit 1
      fi
    done
  ' -- $names
}

for attempt in 1 2; do
  if ! compose up -d --force-recreate --wait --wait-timeout 120 > "$temporary/output" 2>&1; then
    cat "$temporary/output" >&2
    compose logs >&2
    exit 1
  fi
  uids=()
  while IFS=$'\t' read -r service user; do
    uid=${user%%:*}
    [[ "$uid" != 0 ]]
    container=$(compose ps -q "$service")
    [[ "$(docker top "$container" -eo uid | tail -n +2 | sort -u | xargs)" == "$uid" ]]
    uids+=("$uid")
  done < <(jq -r '.services | to_entries[] | select(.key != "permissions-init") |
    [.key, .value.user] | @tsv' "$temporary/compose.json")
  [[ "$(printf '%s\n' "${uids[@]}" | sort -u | wc -l)" == "${#uids[@]}" ]]

  check_secrets api 10001 'jwt_secret bootstrap_admin_password encryption_key discord_webhook_url store_information_initial_data'
  check_secrets garage 10002 'garage_rpc_secret garage_access_key garage_secret_key'
  check_secrets litestream 10004 'garage_credentials'
  check_secrets grafana 472 'grafana_user grafana_password'
  compose exec -T api /bin/sh -ec '
    test "$(stat -c %u:%g:%a /data)" = 10001:10001:2770
    test "$(stat -c %a /data/elysia.sqlite)" = 660
    test "$(cat /data/existing/sentinel)" = preserved
  '
  compose run --rm --no-deps --entrypoint /bin/sh permissions-init -ec '
    for pair in /var/lib/garage:10002 /var/tempo:10007 /loki:10008 /prometheus:10009 /var/lib/grafana:472; do
      directory=${pair%:*}
      owner=${pair##*:}
      test "$(stat -c %u:%g "$directory/existing/sentinel")" = "$owner:$owner"
      test "$(cat "$directory/existing/sentinel")" = preserved
    done
  '
  compose exec -T api bun -e '
    const urls = [
      "http://spa:3111/", "http://mailpit:8025/readyz",
      "http://otel-collector:13133/", "http://tempo:3200/ready",
      "http://loki:3100/ready", "http://prometheus:9090/-/ready",
      "http://grafana:3000/api/health",
    ];
    for (const url of urls) {
      let ready = false;
      for (let attempt = 0; attempt < 60; attempt++) {
        const response = await fetch(url, { signal: AbortSignal.timeout(2000) });
        if (response.ok) { ready = true; break; }
        await Bun.sleep(1000);
      }
      if (!ready) throw new Error(`Service not ready: ${url}`);
    }
  '
  [[ "$(for secret in "${secrets[@]}"; do stat -c '%u:%g:%a' "$temporary/$secret"; done)" == "$source_owners" ]]
done
echo "Release permissions passed: distinct non-root UIDs, private secrets, volume migration, healthy services and reruns."
