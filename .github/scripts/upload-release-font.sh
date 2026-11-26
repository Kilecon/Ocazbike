#!/usr/bin/env bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
FONT=${1:-"$ROOT/spa/public/assets/fonts/Chillax-Variable.woff2"}
VPS_HOST=${VPS_HOST:-}
VPS_USERNAME=${VPS_USERNAME:-}
VPS_DIR=${VPS_DIR:-}
VPS_SSH_PORT=${VPS_SSH_PORT:-22}
VPS_SSH_KEY=${VPS_SSH_KEY:-${SSH_KEY:-}}
VPS_HOST_FINGERPRINT=${VPS_HOST_FINGERPRINT:-}

usage() {
  cat >&2 <<'EOF'
Usage:
  VPS_HOST=<host> VPS_USERNAME=<user> VPS_DIR=<remote-dir> \
  VPS_SSH_KEY=<private-key-path-or-content> [VPS_SSH_PORT=22] \
  ./scripts/upload-release-font.sh [local-font]
EOF
}

if [[ -z "$VPS_HOST" || -z "$VPS_USERNAME" || -z "$VPS_DIR" || -z "$VPS_SSH_KEY" ]]; then
  usage
  exit 1
fi
if [[ ! -s "$FONT" ]]; then
  echo "Missing or empty Chillax font: $FONT" >&2
  exit 1
fi

key=$(mktemp)
known_hosts=$(mktemp)
trap 'rm -f -- "$key" "$known_hosts"' EXIT

if [[ -f "$VPS_SSH_KEY" ]]; then
  cp "$VPS_SSH_KEY" "$key"
elif [[ "$VPS_SSH_KEY" == -----BEGIN* ]]; then
  printf '%s\n' "$VPS_SSH_KEY" > "$key"
else
  echo "VPS_SSH_KEY must be a private-key path or private-key content." >&2
  exit 1
fi
chmod 600 "$key"

ssh-keyscan -H -p "$VPS_SSH_PORT" "$VPS_HOST" > "$known_hosts" 2>/dev/null
if [[ -n "$VPS_HOST_FINGERPRINT" ]]; then
  if [[ "$VPS_HOST_FINGERPRINT" == SHA256:* ]]; then
    fingerprints=$(ssh-keygen -lf "$known_hosts" | awk '{print $2}')
  elif [[ "$VPS_HOST_FINGERPRINT" == MD5:* ]]; then
    fingerprints=$(ssh-keygen -E md5 -lf "$known_hosts" | awk '{print $2}')
  else
    fingerprints=$(ssh-keygen -lf "$known_hosts" | awk '{print $2}')
  fi
  if ! grep -Fxq "$VPS_HOST_FINGERPRINT" <<< "$fingerprints"; then
    echo "VPS host fingerprint mismatch." >&2
    exit 1
  fi
fi

ssh_options=(
  -i "$key"
  -o StrictHostKeyChecking=yes
  -o "UserKnownHostsFile=$known_hosts"
)

ssh "${ssh_options[@]}" -p "$VPS_SSH_PORT" "$VPS_USERNAME@$VPS_HOST" \
  "mkdir -p '$VPS_DIR/da/secrets' && chmod 700 '$VPS_DIR/da/secrets'"

scp -P "$VPS_SSH_PORT" "${ssh_options[@]}" \
  "$FONT" \
  "$VPS_USERNAME@$VPS_HOST:$VPS_DIR/da/secrets/Chillax-Variable.woff2"

ssh "${ssh_options[@]}" -p "$VPS_SSH_PORT" "$VPS_USERNAME@$VPS_HOST" \
  "chmod 600 '$VPS_DIR/da/secrets/Chillax-Variable.woff2'"

echo "Chillax font installed on the VPS."
