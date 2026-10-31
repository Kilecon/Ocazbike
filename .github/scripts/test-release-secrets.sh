#!/usr/bin/env bash
set -euo pipefail
umask 077

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
temporary=$(mktemp -d)
cleanup() {
  rm -f "$temporary/github-env" "$temporary/output" "$temporary/missing" \
    "$temporary/infra/compose.yaml" "$temporary/infra/scripts/init-release-secrets.sh" \
    "$temporary/da/.env" "$temporary/da/secrets/grafana_user" \
    "$temporary/da/secrets/grafana_password"
  rmdir "$temporary/da/secrets" "$temporary/da" "$temporary/infra/scripts" \
    "$temporary/infra" "$temporary"
}
trap cleanup EXIT
mkdir -p "$temporary/infra/scripts" "$temporary/da"
cp "$ROOT/infra/compose.yaml" "$temporary/infra/compose.yaml"
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
# Do not let runner variables override the VPS env-file during validation.
unset BOOTSTRAP_ADMIN_PASSWORD JWT_SECRET ENCRYPTION_KEY GARAGE_RPC_SECRET GARAGE_DEFAULT_ACCESS_KEY \
  GARAGE_DEFAULT_SECRET_KEY GRAFANA_USER GRAFANA_PASSWORD SPA_API_URL CORS_ORIGIN \
  STORE_INFORMATION_INITIAL_DATA
bash "$temporary/infra/scripts/init-release-secrets.sh" >> "$temporary/output"
bash "$temporary/infra/scripts/init-release-secrets.sh" >> "$temporary/output"
[[ $(stat -c %a "$temporary/da/.env") == 600 ]]
[[ $(stat -c %a "$temporary/da/secrets") == 700 ]]
[[ $(stat -c %a "$temporary/da/secrets/grafana_password") == 644 ]]
[[ $(cat "$temporary/da/secrets/grafana_password") == test-password-long ]]
resolved=$(docker compose --env-file "$temporary/da/.env" \
  -f "$temporary/infra/compose.yaml" config --environment)
grep -Fqx "GARAGE_DEFAULT_SECRET_KEY=spaces \$VAR 'quoted' \"double\" \\path" <<< "$resolved"
grep -Fqx "BOOTSTRAP_ADMIN_PASSWORD=test-bootstrap-password" <<< "$resolved"
grep -Fqx "STORE_INFORMATION_INITIAL_DATA={\"name\":\"L'atelier \$HOME\",\"address\":\"line\\\\next\"}" <<< "$resolved"
original=$(sha256sum "$temporary/da/.env")
RELEASE_ENV_B64=$(printf "ENCRYPTION_KEY='%064d'\n" 0 | base64 -w 0)
export RELEASE_ENV_B64
if bash "$temporary/infra/scripts/init-release-secrets.sh" >> "$temporary/output" 2>&1; then
  echo "Protected-key rotation was not rejected." >&2
  exit 1
fi
[[ $(sha256sum "$temporary/da/.env") == "$original" ]]
if grep -Fq "test-password-long" "$temporary/output"; then
  echo "A secret appeared in script output." >&2
  exit 1
fi
echo "Release secret tests passed: missing values, Compose roundtrip, permissions, reruns, rotation refusal, no plaintext logs."
