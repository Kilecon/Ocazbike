#!/usr/bin/env bash
set -euo pipefail
set +x
umask 077

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPOSITORY_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
cd "$REPOSITORY_ROOT"

: "${RELEASE_ENV_B64:?Missing encoded release environment}"
: "${GRAFANA_USER_B64:?Missing encoded Grafana user}"
: "${GRAFANA_PASSWORD_B64:?Missing encoded Grafana password}"

if [[ -L da/.env || -L da/secrets ]]; then
  echo "Refusing symlinked secret paths." >&2
  exit 1
fi
mkdir -p da/secrets
chmod 700 da/secrets
temporary=$(mktemp -d da/secrets/.release.XXXXXX)
cleanup() { rm -f "$temporary/.env" "$temporary/grafana_user" "$temporary/grafana_password"; rmdir "$temporary"; }
trap cleanup EXIT

printf '%s' "$RELEASE_ENV_B64" | base64 --decode > "$temporary/.env"
printf '%s' "$GRAFANA_USER_B64" | base64 --decode > "$temporary/grafana_user"
printf '%s' "$GRAFANA_PASSWORD_B64" | base64 --decode > "$temporary/grafana_password"
for file in .env grafana_user grafana_password; do
  if [[ ! -s "$temporary/$file" ]]; then
    echo "Empty release secret file: $file" >&2
    exit 1
  fi
done

# Compare protected keys without printing the resolved Compose environment.
compare_key() {
  local name=$1 previous current
  previous=$(docker compose --env-file da/.env -f infra/compose.yaml config --environment |
    sed -n "s/^${name}=//p")
  current=$(docker compose --env-file "$temporary/.env" -f infra/compose.yaml config --environment |
    sed -n "s/^${name}=//p")
  if [[ -z "$previous" || "$previous" != "$current" ]]; then
    echo "$name differs from the VPS; a separate rotation is required." >&2
    exit 1
  fi
}
if [[ -f da/.env ]]; then
  for name in ENCRYPTION_KEY GARAGE_RPC_SECRET GARAGE_DEFAULT_ACCESS_KEY GARAGE_DEFAULT_SECRET_KEY; do
    if grep -Eq "^[[:space:]]*(export[[:space:]]+)?${name}[[:space:]]*=" da/.env; then
      compare_key "$name"
    fi
  done
fi
for file in grafana_user grafana_password; do
  if [[ -L da/secrets/$file ]]; then
    echo "Refusing symlinked Grafana secrets." >&2
    exit 1
  fi
  if [[ -f da/secrets/$file ]] &&
     [[ "$(cat "da/secrets/$file")" != "$(cat "$temporary/$file")" ]]; then
    echo "$file differs from the VPS; a separate Grafana rotation is required." >&2
    exit 1
  fi
done

docker compose --env-file "$temporary/.env" -f infra/compose.yaml config --quiet
chmod 600 "$temporary/.env"
# Grafana UID 472 reads the bind-mounted files; the host parent is mode 700.
chmod 644 "$temporary/grafana_user" "$temporary/grafana_password"
mv "$temporary/.env" da/.env
mv "$temporary/grafana_user" da/secrets/grafana_user
mv "$temporary/grafana_password" da/secrets/grafana_password
echo "Release secrets installed without displaying their values."
