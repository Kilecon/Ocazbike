#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
temporary=$(mktemp -d)
project="release-permissions-$(date +%s)-$$"
resources_created=false
secrets=(jwt_secret bootstrap_admin_password encryption_key discord_webhook_url \
  store_information_initial_data garage_rpc_secret garage_access_key garage_secret_key \
  garage_credentials grafana_user grafana_password smtp_password mailpit_smtp_auth)
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
printf 'test-smtp-password' > "$temporary/smtp_password"
printf 'ocazbike:test-smtp-password\n' > "$temporary/mailpit_smtp_auth"
printf 'test-password-long' > "$temporary/grafana_password"
chmod 644 "$temporary"/*

# Render the real release config, isolating only images, host ports, logging and sources.
docker compose -p "$project" --env-file "$ROOT/da/.env" -f "$ROOT/infra/compose.release.yaml" config --format json |
  jq --arg directory "$temporary" --arg project "$project" '
    .secrets |= with_entries(.value.file = ($directory + "/" + .key)) |
    .networks.proxying = {internal: true} |
    .services |= with_entries(
      .value.logging = {driver: "local"} |
      .value.restart = "no" |
      del(.value.ports) |
      if .value.healthcheck and (.value.healthcheck.disable != true) then
        .value.healthcheck.interval = "2s" | .value.healthcheck.start_period = "30s"
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
jq -e '
  (.services.api.networks | has("mailpit")) and
  (.services.spa.networks | has("observability") | not) and
  (.services.grafana.networks | has("proxying") | not) and
  (.services.mailpit.networks | keys == ["mailpit"]) and
  (.services.mailpit.environment.MP_SMTP_REQUIRE_TLS == "true") and
  (.services.mailpit.environment.MP_SMTP_AUTH_FILE == "/run/secrets/mailpit_smtp_auth") and
  (.services.api.environment.SMTP_SECURE == "true") and
  (.services.api.environment.SMTP_PASSWORD_FILE == "/run/secrets/smtp_password") and
  (.networks.pdf.internal == true) and
  (.services.gotenberg.networks | keys == ["pdf"]) and
  (.services.api.networks | has("pdf")) and
  (.services.api.environment.GOTENBERG_URL == "http://gotenberg:3000") and
  (.services.gotenberg.environment.CHROMIUM_DISABLE_JAVASCRIPT == "true")
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
  local service=$1 owner=$2 group=$3 names=$4
  compose exec -T "$service" /bin/sh -ec '
    owner=$1
    group=$2
    shift 2
    awk '\''$2 == "/run/secrets" && $3 == "tmpfs" { found = 1 } END { exit !found }'\'' /proc/mounts
    test "$(stat -c %u:%g:%a /run/secrets)" = "$owner:$group:700"
    test "$(ls -A /run/secrets | wc -l)" = "$#"
    for secret do
      test "$(stat -c %u:%g:%a "/run/secrets/$secret")" = "$owner:$group:600"
      cat "/run/secrets/$secret" >/dev/null
    done
  ' -- "$owner" "$group" $names
  compose exec -T --user 10003:10001 "$service" /bin/sh -ec '
    for secret do
      if cat "/run/secrets/$secret" >/dev/null 2>&1; then
        echo "Another service user could read a secret." >&2
        exit 1
      fi
    done
  ' -- $names
}

check_api_secrets() {
  compose exec -T api /usr/local/bin/bun -e '
    import { strict as assert } from "node:assert";
    import { readFileSync, statSync } from "node:fs";
    const names = ["jwt_secret", "bootstrap_admin_password", "encryption_key",
      "discord_webhook_url", "store_information_initial_data", "smtp_password"];
    assert.match(readFileSync("/proc/mounts", "utf8"), /^.* \/run\/secrets tmpfs .*$/m);
    const directory = statSync("/run/secrets");
    assert.equal(`${directory.uid}:${directory.gid}:${directory.mode & 0o777}`, "10001:10001:448");
    for (const name of names) {
      const stat = statSync(`/run/secrets/${name}`);
      assert.equal(`${stat.uid}:${stat.gid}:${stat.mode & 0o777}`, "10001:10001:384");
      readFileSync(`/run/secrets/${name}`);
    }
  '
  compose exec -T --user 10003:10001 api /usr/local/bin/bun -e '
    import { strict as assert } from "node:assert";
    import { readFileSync } from "node:fs";
    for (const name of ["jwt_secret", "bootstrap_admin_password", "encryption_key",
      "discord_webhook_url", "store_information_initial_data", "smtp_password"]) {
      assert.throws(() => readFileSync(`/run/secrets/${name}`), { code: "EACCES" });
    }
  '
}

check_pdf_renderer() {
  compose exec -T api /usr/local/bin/bun -e '
    import { strict as assert } from "node:assert";
    import { renderBillingDocumentPdf } from "./src/features/billing/email/renderBillingDocumentPdf";
    import { GotenbergPdfRenderer } from "./src/shared/pdf/GotenbergPdfRenderer";
    import { EMPTY_STORE_INFORMATION } from "./src/features/store-information/model";
    const pdf = await renderBillingDocumentPdf({
      kind: "quote", status: "pending", createdAt: 0, updatedAt: 0,
      payload: {
        documentNumber: "DEV-TEST", type: "repair", date: Date.UTC(2026, 0, 5),
        validUntil: Date.UTC(2026, 1, 5),
        client: { firstname: "Test", lastname: "Client", email: "client@example.test",
          phonenumber: "", isProfessional: false },
        lines: [{ description: "Revision", quantity: "1", unitPrice: "50",
          vatRate: "20", total: "60" }],
      },
    }, EMPTY_STORE_INFORMATION, new GotenbergPdfRenderer());
    assert.equal(new TextDecoder().decode(pdf.subarray(0, 5)), "%PDF-");
    assert.ok(pdf.length > 1000);
  '
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
    [[ "$(docker top "$container" -eo pid,uid | awk 'NR > 1 { print $2 }' | sort -u | xargs)" == "$uid" ]]
    uids+=("$uid")
  done < <(jq -r '.services | to_entries[] | select(.key != "permissions-init") |
    [.key, .value.user] | @tsv' "$temporary/compose.json")
  [[ "$(printf '%s\n' "${uids[@]}" | sort -u | wc -l)" == "${#uids[@]}" ]]

  check_api_secrets
  check_pdf_renderer
  check_secrets garage 10002 10002 'garage_rpc_secret garage_access_key garage_secret_key'
  check_secrets litestream 10004 10001 'garage_credentials'
  check_secrets grafana 472 472 'grafana_user grafana_password'
  compose exec -T api /usr/local/bin/bun -e '
    import { strict as assert } from "node:assert";
    import { readFileSync, statSync } from "node:fs";
    const directory = statSync("/data");
    const database = statSync("/data/elysia.sqlite");
    assert.equal(`${directory.uid}:${directory.gid}:${directory.mode & 0o777}`, "10001:10001:504");
    assert.equal(database.mode & 0o777, 0o660);
    assert.equal(readFileSync("/data/existing/sentinel", "utf8"), "preserved");
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
echo "Release permissions passed: distinct non-root UIDs, tmpfs secrets, volume migration, isolated networks, healthy services and reruns."
