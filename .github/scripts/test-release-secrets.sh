#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
temporary=$(mktemp -d)
files=(jwt_secret bootstrap_admin_password encryption_key garage_rpc_secret garage_access_key \
  garage_secret_key garage_credentials grafana_user grafana_password discord_webhook_url store_information_initial_data)
cleanup() {
  for file in "${files[@]}"; do rm -f "$temporary/da/secrets/$file"; done
  rm -f "$temporary/github-env" "$temporary/output" "$temporary/missing" \
    "$temporary/infra/compose.yaml" "$temporary/infra/compose.release.yaml" \
    "$temporary/infra/scripts/init-release-secrets.sh" "$temporary/da/.env"
  rmdir "$temporary/da/secrets" "$temporary/da" "$temporary/infra/scripts" \
    "$temporary/infra" "$temporary"
}
trap cleanup EXIT
mkdir -p "$temporary/infra/scripts" "$temporary/da/secrets"
cp "$ROOT/infra/compose.yaml" "$ROOT/infra/compose.release.yaml" "$temporary/infra/"
cp "$ROOT/infra/scripts/init-release-secrets.sh" "$temporary/infra/scripts/"
export GITHUB_ENV="$temporary/github-env"
export JWT_SECRET=01234567890123456789012345678901
export BOOTSTRAP_ADMIN_PASSWORD=test-bootstrap-password
export ENCRYPTION_KEY=eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee
export GARAGE_RPC_SECRET=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
export GARAGE_DEFAULT_ACCESS_KEY=test-access
export GARAGE_DEFAULT_SECRET_KEY="spaces \$VAR 'quoted' \"double\" \\path"
export GRAFANA_USER=admin
export GRAFANA_PASSWORD=test-password-long
export SPA_API_URL=https://api.release.example.com
export CORS_ORIGIN=https://release.example.com
export STORE_INFORMATION_INITIAL_DATA="{\"name\":\"L'atelier \$HOME\",\"address\":\"line\\\\next\"}"

if env -u JWT_SECRET bash "$ROOT/.github/scripts/prepare-release-secrets.sh" \
  > "$temporary/missing" 2>&1; then
  echo "Missing-secret validation failed." >&2
  exit 1
fi
bash "$ROOT/.github/scripts/prepare-release-secrets.sh" > "$temporary/output"
while IFS= read -r assignment; do export "$assignment"; done < "$GITHUB_ENV"

# Simulate an existing release env file, including Compose escaping.
for name in ENCRYPTION_KEY GARAGE_RPC_SECRET GARAGE_DEFAULT_ACCESS_KEY GARAGE_DEFAULT_SECRET_KEY; do
  value=$(printenv "$name")
  value=${value//\'/\\\'}
  printf "%s='%s'\n" "$name" "$value" >> "$temporary/da/.env"
done
unset BOOTSTRAP_ADMIN_PASSWORD JWT_SECRET ENCRYPTION_KEY GARAGE_RPC_SECRET GARAGE_DEFAULT_ACCESS_KEY \
  GARAGE_DEFAULT_SECRET_KEY GRAFANA_USER GRAFANA_PASSWORD SPA_API_URL CORS_ORIGIN \
  STORE_INFORMATION_INITIAL_DATA
original=$(sha256sum "$temporary/da/.env")
saved_key=$ENCRYPTION_KEY_B64
ENCRYPTION_KEY_B64=$(printf '%064d' 0 | base64 -w 0)
export ENCRYPTION_KEY_B64
if bash "$temporary/infra/scripts/init-release-secrets.sh" >> "$temporary/output" 2>&1; then
  echo "Legacy protected-key mismatch was not rejected." >&2
  exit 1
fi
[[ $(sha256sum "$temporary/da/.env") == "$original" ]]
ENCRYPTION_KEY_B64=$saved_key
export ENCRYPTION_KEY_B64
bash "$temporary/infra/scripts/init-release-secrets.sh" >> "$temporary/output"
chmod 644 "$temporary/da/secrets/jwt_secret"
bash "$temporary/infra/scripts/init-release-secrets.sh" >> "$temporary/output"
[[ $(stat -c %a "$temporary/da/.env") == 600 ]]
[[ $(stat -c %a "$temporary/da/secrets") == 700 ]]
[[ $(stat -c %a "$temporary/da/secrets/garage_rpc_secret") == 600 ]]
[[ $(stat -c %a "$temporary/da/secrets/jwt_secret") == 700 ]]
[[ $(stat -c %u:%g "$temporary/da/secrets/jwt_secret") == "$(id -u):$(id -g)" ]]
[[ $(cat "$temporary/da/secrets/jwt_secret") == 01234567890123456789012345678901 ]]
[[ $(cat "$temporary/da/secrets/grafana_password") == test-password-long ]]
[[ $(cat "$temporary/da/secrets/garage_secret_key") == "spaces \$VAR 'quoted' \"double\" \\path" ]]
[[ $(cat "$temporary/da/secrets/store_information_initial_data") == "{\"name\":\"L'atelier \$HOME\",\"address\":\"line\\\\next\"}" ]]
[[ ! -s "$temporary/da/secrets/discord_webhook_url" ]]
if grep -Eq 'JWT_SECRET|ENCRYPTION_KEY|GARAGE_|BOOTSTRAP_ADMIN_PASSWORD|DISCORD_WEBHOOK_URL|STORE_INFORMATION' "$temporary/da/.env"; then
  echo "Secret remained in the Compose environment file." >&2
  exit 1
fi
original=$(sha256sum "$temporary/da/.env" "$temporary/da/secrets/encryption_key")
ENCRYPTION_KEY_B64=$(printf '%064d' 0 | base64 -w 0)
export ENCRYPTION_KEY_B64
if bash "$temporary/infra/scripts/init-release-secrets.sh" >> "$temporary/output" 2>&1; then
  echo "Protected-key rotation was not rejected." >&2
  exit 1
fi
[[ $(sha256sum "$temporary/da/.env" "$temporary/da/secrets/encryption_key") == "$original" ]]
if grep -Fq "test-password-long" "$temporary/output"; then
  echo "A secret appeared in script output." >&2
  exit 1
fi
echo "Release secret tests passed: migration, permissions, reruns, rotation refusal, no plaintext logs."
