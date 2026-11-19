#!/usr/bin/env bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
test_id="app-permissions-$(date +%s)-$$"
built_images=()
secret_volume="${test_id}-secrets"
cleanup() {
  for image in "${built_images[@]}"; do docker image rm "$image"; done
  docker volume rm "$secret_volume" >/dev/null 2>&1 || true
}
trap cleanup EXIT

for service in da spa; do
  image="ocazbike-$service:$test_id"
  docker build -t "$image" "$ROOT/$service"
  built_images+=("$image")
done

docker volume create "$secret_volume" >/dev/null
docker run --rm --network none --read-only --user 0:0 \
  --mount "type=volume,source=$secret_volume,target=/run/secrets" \
  --entrypoint /usr/local/bin/bun "ocazbike-da:$test_id" -e '
    import { chmodSync, chownSync, mkdirSync, writeFileSync } from "node:fs";
    mkdirSync("/run/secrets", { recursive: true, mode: 0o700 });
    chownSync("/run/secrets", 10001, 10001);
    chmodSync("/run/secrets", 0o700);
    for (const name of ["jwt_secret", "bootstrap_admin_password", "encryption_key"]) {
      writeFileSync(`/run/secrets/${name}`, "test-value", { mode: 0o600 });
    }
    writeFileSync("/run/secrets/discord_webhook_url",
      "https://discord.example/api/webhooks/test/fake-token", { mode: 0o600 });
    writeFileSync("/run/secrets/store_information_initial_data", "", { mode: 0o600 });
    for (const name of ["jwt_secret", "bootstrap_admin_password", "encryption_key",
      "discord_webhook_url", "store_information_initial_data"]) {
      chownSync(`/run/secrets/${name}`, 10001, 10001);
      chmodSync(`/run/secrets/${name}`, 0o600);
    }
  '
docker run --rm --network none --read-only --cap-drop ALL --user 10001:10001 \
  --tmpfs /tmp --tmpfs /data:uid=10001,gid=10001 \
  --mount "type=volume,source=$secret_volume,target=/run/secrets,readonly" \
  --entrypoint /usr/local/bin/bun "ocazbike-da:$test_id" -e '
    import { strict as assert } from "node:assert";
    import { statSync } from "node:fs";
    import { loadRuntimeEnvironment } from "./src/shared/config/secrets";
    import { DiscordSupportNotifier } from "./src/features/support/infrastructure/DiscordSupportNotifier";
    assert.equal(process.getuid(), 10001);
    assert.equal((await Bun.file("/bin/sh").exists()), false);
    assert.equal(statSync("/data").uid, 10001);
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
  '
docker run --rm --network none --read-only --cap-drop ALL --user 10003:10003 \
  --tmpfs /tmp \
  --mount "type=volume,source=$secret_volume,target=/run/secrets,readonly" \
  --entrypoint /usr/local/bin/bun "ocazbike-da:$test_id" -e '
    import { strict as assert } from "node:assert";
    import { readFileSync } from "node:fs";
    assert.throws(() => readFileSync("/run/secrets/discord_webhook_url"), { code: "EACCES" });
  '
docker run --rm --network none --read-only --cap-drop ALL \
  --entrypoint /bin/sh "ocazbike-spa:$test_id" -ec '
    test "$(id -un)" = spa
    test "$(id -u):$(id -g)" = 10003:10003
    test -r /app/server.ts
    test -r /app/dist/index.html
  '
echo "App permissions passed: non-root users, private API secrets, webhook loaded, SPA denied access."
