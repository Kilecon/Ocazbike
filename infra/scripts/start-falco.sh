#!/usr/bin/env bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
webhook_file="$ROOT/da/secrets/discord_webhook_url"

if [[ ! -s "$webhook_file" ]]; then
  echo "Configure da/secrets/discord_webhook_url before starting Falco." >&2
  exit 1
fi

DISCORD_WEBHOOK_URL=$(<"$webhook_file")
export DISCORD_WEBHOOK_URL

docker compose -p ocazbike-falco -f "$ROOT/infra/compose.falco.yaml" \
  up -d --wait --wait-timeout 60
