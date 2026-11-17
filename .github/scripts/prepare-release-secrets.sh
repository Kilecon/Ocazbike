#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077
export DISCORD_WEBHOOK_URL=${DISCORD_WEBHOOK_URL:-}
export BOOTSTRAP_ADMIN_PASSWORD=${BOOTSTRAP_ADMIN_PASSWORD:-}
export STORE_INFORMATION_INITIAL_DATA=${STORE_INFORMATION_INITIAL_DATA:-}
export SPA_APP_ID=${SPA_APP_ID:-my-spa}
export MAILPIT_UI_PORT=${MAILPIT_UI_PORT:-8025}
export COOKIE_SECURE=${COOKIE_SECURE:-true}

for name in JWT_SECRET BOOTSTRAP_ADMIN_PASSWORD ENCRYPTION_KEY GARAGE_RPC_SECRET GARAGE_DEFAULT_ACCESS_KEY \
  GARAGE_DEFAULT_SECRET_KEY GRAFANA_USER GRAFANA_PASSWORD SPA_API_URL CORS_ORIGIN; do
  if ! value=$(printenv "$name") || [[ -z "$value" ]]; then
    echo "::error::Missing release setting: $name" >&2
    exit 1
  fi
done
if [[ ${#JWT_SECRET} -lt 32 || ${#GRAFANA_PASSWORD} -lt 16 || ${#BOOTSTRAP_ADMIN_PASSWORD} -lt 12 ]]; then
  echo "::error::JWT_SECRET requires 32 characters, GRAFANA_PASSWORD 16, and BOOTSTRAP_ADMIN_PASSWORD 12." >&2
  exit 1
fi
for name in ENCRYPTION_KEY GARAGE_RPC_SECRET; do
  value=$(printenv "$name")
  if [[ ! $value =~ ^[[:xdigit:]]{64}$ ]]; then
    echo "::error::$name must contain 64 hexadecimal characters." >&2
    exit 1
  fi
done
for name in JWT_SECRET BOOTSTRAP_ADMIN_PASSWORD ENCRYPTION_KEY GARAGE_RPC_SECRET \
  GARAGE_DEFAULT_ACCESS_KEY GARAGE_DEFAULT_SECRET_KEY GRAFANA_USER GRAFANA_PASSWORD \
  DISCORD_WEBHOOK_URL STORE_INFORMATION_INITIAL_DATA SPA_API_URL CORS_ORIGIN SPA_APP_ID MAILPIT_UI_PORT COOKIE_SECURE; do
  value=$(printenv "$name")
  if [[ "$value" == *$'\n'* || "$value" == *$'\r'* ]]; then
    echo "::error::$name must be a single line." >&2
    exit 1
  fi
done

temporary=$(mktemp)
trap 'rm -f "$temporary"' EXIT
for name in SPA_API_URL CORS_ORIGIN SPA_APP_ID MAILPIT_UI_PORT COOKIE_SECURE; do
  value=$(printenv "$name")
  value=${value//\'/\\\'}
  printf "%s='%s'\n" "$name" "$value" >> "$temporary"
done
export_masked() {
  local name=$1 value=$2
  if [[ -n "$value" ]]; then printf '::add-mask::%s\n' "$value"; fi
  printf '%s=%s\n' "$name" "$value" >> "$GITHUB_ENV"
}
export_masked RELEASE_ENV_B64 "$(base64 -w 0 "$temporary")"
for name in JWT_SECRET BOOTSTRAP_ADMIN_PASSWORD ENCRYPTION_KEY GARAGE_RPC_SECRET \
  GARAGE_DEFAULT_ACCESS_KEY GARAGE_DEFAULT_SECRET_KEY GRAFANA_USER GRAFANA_PASSWORD \
  DISCORD_WEBHOOK_URL STORE_INFORMATION_INITIAL_DATA; do
  value=$(printenv "$name")
  export_masked "${name}_B64" "$(printf '%s' "$value" | base64 -w 0)"
done
