#!/usr/bin/env bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
test_id="app-permissions-$(date +%s)-$$"
built_images=()
cleanup() {
  for image in "${built_images[@]}"; do docker image rm "$image"; done
}
trap cleanup EXIT

for service in da spa; do
  image="ocazbike-$service:$test_id"
  docker build -t "$image" "$ROOT/$service"
  built_images+=("$image")
done

# All writable paths are ephemeral tmpfs; no host secrets or named volumes are mounted.
docker run --rm --network none --read-only --user 0:0 \
  --cap-drop ALL --cap-add CHOWN --cap-add DAC_OVERRIDE --cap-add FOWNER \
  --cap-add SETUID --cap-add SETGID \
  --tmpfs /run/secrets:uid=10001,gid=10001,mode=0700 --tmpfs /data \
  --tmpfs /var/lib/garage --tmpfs /var/lib/grafana --tmpfs /var/tempo \
  --tmpfs /loki --tmpfs /prometheus --tmpfs /tmp \
  --mount "type=bind,source=$ROOT/infra/docker/release-permissions.sh,target=/release-permissions.sh,readonly" \
  --entrypoint /bin/sh "ocazbike-da:$test_id" -ec '
    umask 077
    test "$(id -u api):$(id -g api)" = 10001:10001
    for secret in jwt_secret bootstrap_admin_password encryption_key garage_rpc_secret \
      garage_access_key garage_secret_key garage_credentials grafana_user grafana_password; do
      printf test-value > "/run/secrets/$secret"
      chown 10001:10001 "/run/secrets/$secret"
      chmod 600 "/run/secrets/$secret"
    done
    printf https://discord.example/api/webhooks/test/fake-token > /run/secrets/discord_webhook_url
    : > /run/secrets/store_information_initial_data
    chown 10001:10001 /run/secrets/discord_webhook_url /run/secrets/store_information_initial_data
    chmod 600 /run/secrets/discord_webhook_url /run/secrets/store_information_initial_data
    sh /release-permissions.sh
    setpriv --reuid=api --regid=api --clear-groups bun -e '\''
      import { strict as assert } from "node:assert";
      import { statSync } from "node:fs";
      import { loadRuntimeEnvironment } from "./src/shared/config/secrets";
      import { DiscordSupportNotifier } from "./src/features/support/infrastructure/DiscordSupportNotifier";
      assert.equal(process.getuid(), 10001);
      for (const name of ["jwt_secret", "encryption_key", "bootstrap_admin_password",
        "discord_webhook_url", "store_information_initial_data"]) {
        const stat = statSync(`/run/secrets/${name}`);
        assert.equal(stat.uid, 10001);
        assert.equal(stat.gid, 10001);
        assert.equal(stat.mode & 0o777, 0o600);
      }
      const env = loadRuntimeEnvironment({
        NODE_ENV: "production",
        JWT_SECRET_FILE: "/run/secrets/jwt_secret",
        ENCRYPTION_KEY_FILE: "/run/secrets/encryption_key",
        DISCORD_WEBHOOK_URL_FILE: "/run/secrets/discord_webhook_url",
      });
      assert.equal(env.DISCORD_WEBHOOK_URL, "https://discord.example/api/webhooks/test/fake-token");
      let called = false;
      const notifier = new DiscordSupportNotifier(env.DISCORD_WEBHOOK_URL, async (url) => {
        assert.equal(url, env.DISCORD_WEBHOOK_URL);
        called = true;
        return new Response(null, { status: 204 });
      });
      await notifier.notify({
        type: "BUG", title: "Test", description: "Test", reference: "TEST",
        createdByUserId: null, createdAt: new Date().toISOString(),
      });
      assert.equal(called, true);
    '\''
    setpriv --reuid=10003 --regid=10003 --clear-groups bun -e '\''
      import { strict as assert } from "node:assert";
      import { readFileSync } from "node:fs";
      assert.throws(() => readFileSync("/run/secrets/discord_webhook_url"), { code: "EACCES" });
    '\''
  '
docker run --rm --network none --read-only --cap-drop ALL \
  --entrypoint /bin/sh "ocazbike-spa:$test_id" -ec '
    test "$(id -un)" = spa
    test "$(id -u):$(id -g)" = 10003:10003
    test -r /app/server.ts
    test -r /app/dist/index.html
  '
echo "App permissions passed: non-root users, API secrets on tmpfs, webhook loaded, SPA denied access."
