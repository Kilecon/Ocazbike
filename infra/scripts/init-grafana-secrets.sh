#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
REPOSITORY_ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
secret_dir="$REPOSITORY_ROOT/da/secrets"
user_file="$secret_dir/grafana_user"
password_file="$secret_dir/grafana_password"

if [ -e "$user_file" ] || [ -e "$password_file" ]; then
  if [ -f "$user_file" ] && [ -f "$password_file" ]; then
    echo "Grafana secret files already exist; leaving them unchanged."
    exit 0
  fi
  echo "Only one Grafana secret file exists. Complete or remove the pair manually." >&2
  exit 1
fi

if ! command -v openssl >/dev/null 2>&1; then
  echo "openssl is required to generate a random Grafana password." >&2
  exit 1
fi

umask 077
mkdir -p "$secret_dir"
chmod 700 "$secret_dir"

user_tmp=$(mktemp "$secret_dir/.grafana_user.XXXXXX")
password_tmp=$(mktemp "$secret_dir/.grafana_password.XXXXXX")
cleanup() {
  rm -f "$user_tmp" "$password_tmp"
}
trap cleanup 0
trap 'exit 1' HUP INT TERM

printf '%s' admin > "$user_tmp"
openssl rand -hex 32 > "$password_tmp"
chmod 644 "$user_tmp" "$password_tmp"
mv "$user_tmp" "$user_file"
mv "$password_tmp" "$password_file"

echo "Grafana credentials initialized in da/secrets/; password was not displayed."
