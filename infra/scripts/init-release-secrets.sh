#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPOSITORY_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
cd "$REPOSITORY_ROOT"

: "${RELEASE_ENV_B64:?Missing encoded release environment}"
for name in JWT_SECRET BOOTSTRAP_ADMIN_PASSWORD ENCRYPTION_KEY GARAGE_RPC_SECRET \
  GARAGE_DEFAULT_ACCESS_KEY GARAGE_DEFAULT_SECRET_KEY GRAFANA_USER GRAFANA_PASSWORD; do
  encoded="${name}_B64"
  if ! value=$(printenv "$encoded") || [[ -z "$value" ]]; then
    echo "Missing encoded release secret: $name" >&2
    exit 1
  fi
done

if [[ -L da/.env || -L da/secrets ]]; then
  echo "Refusing symlinked secret paths." >&2
  exit 1
fi
mkdir -p da/secrets
chmod 700 da/secrets
temporary=$(mktemp -d da/secrets/.release.XXXXXX)
files=(.env jwt_secret bootstrap_admin_password encryption_key garage_rpc_secret garage_access_key \
  garage_secret_key garage_credentials grafana_user grafana_password discord_webhook_url store_information_initial_data)
cleanup() {
  for file in "${files[@]}"; do rm -f "$temporary/$file"; done
  rmdir "$temporary"
}
trap cleanup EXIT

printf '%s' "$RELEASE_ENV_B64" | base64 --decode > "$temporary/.env"
decode() {
  local variable=$1 file=$2 value
  if ! value=$(printenv "$variable"); then value=""; fi
  printf '%s' "$value" | base64 --decode > "$temporary/$file"
}
decode JWT_SECRET_B64 jwt_secret
decode BOOTSTRAP_ADMIN_PASSWORD_B64 bootstrap_admin_password
decode ENCRYPTION_KEY_B64 encryption_key
decode GARAGE_RPC_SECRET_B64 garage_rpc_secret
decode GARAGE_DEFAULT_ACCESS_KEY_B64 garage_access_key
decode GARAGE_DEFAULT_SECRET_KEY_B64 garage_secret_key
decode GRAFANA_USER_B64 grafana_user
decode GRAFANA_PASSWORD_B64 grafana_password
decode DISCORD_WEBHOOK_URL_B64 discord_webhook_url
decode STORE_INFORMATION_INITIAL_DATA_B64 store_information_initial_data
for file in .env jwt_secret bootstrap_admin_password encryption_key garage_rpc_secret \
  garage_access_key garage_secret_key grafana_user grafana_password; do
  [[ -s "$temporary/$file" ]] || { echo "Empty release secret file: $file" >&2; exit 1; }
done

for file in "${files[@]}"; do
  [[ "$file" == .env ]] && continue
  if [[ -L da/secrets/$file ]]; then
    echo "Refusing symlinked secret: $file" >&2
    exit 1
  fi
done

for file in encryption_key garage_rpc_secret garage_access_key garage_secret_key grafana_user grafana_password; do
  if [[ -f da/secrets/$file ]] && ! cmp -s "da/secrets/$file" "$temporary/$file"; then
    echo "$file differs from the VPS; a separate rotation is required." >&2
    exit 1
  fi
done

# Preserve the existing keys when migrating from the old Compose env file.
if [[ -f da/.env ]]; then
  for pair in ENCRYPTION_KEY:encryption_key GARAGE_RPC_SECRET:garage_rpc_secret \
    GARAGE_DEFAULT_ACCESS_KEY:garage_access_key GARAGE_DEFAULT_SECRET_KEY:garage_secret_key; do
    name=${pair%%:*}
    file=${pair#*:}
    if grep -Eq "^[[:space:]]*(export[[:space:]]+)?${name}[[:space:]]*=" da/.env; then
      previous=$(env -u "$name" docker compose --env-file da/.env -f infra/compose.release.yaml config --environment |
        sed -n "s/^${name}=//p")
      if [[ -z "$previous" || "$previous" != "$(cat "$temporary/$file")" ]]; then
        echo "$name differs from the VPS; a separate rotation is required." >&2
        exit 1
      fi
    fi
  done
fi

printf '[default]\naws_access_key_id = %s\naws_secret_access_key = %s\n' \
  "$(cat "$temporary/garage_access_key")" "$(cat "$temporary/garage_secret_key")" > "$temporary/garage_credentials"
docker compose --env-file "$temporary/.env" -f infra/compose.release.yaml config --quiet
chmod 600 "$temporary/.env"
chmod 644 "$temporary/garage_rpc_secret"
chmod 700 "$temporary/jwt_secret"
chmod 644 "$temporary/bootstrap_admin_password" "$temporary/encryption_key" \
  "$temporary/garage_access_key" "$temporary/garage_secret_key" "$temporary/garage_credentials" \
  "$temporary/grafana_user" "$temporary/grafana_password" "$temporary/discord_webhook_url" \
  "$temporary/store_information_initial_data"
for file in "${files[@]}"; do
  if [[ "$file" == .env ]]; then mv "$temporary/$file" da/.env
  else mv "$temporary/$file" "da/secrets/$file"
  fi
done
echo "Release secrets installed without displaying their values."
