#!/bin/sh
set -eu
umask 077

for secret in jwt_secret bootstrap_admin_password encryption_key garage_rpc_secret \
  garage_access_key garage_secret_key garage_credentials grafana_user grafana_password; do
  if [ ! -s "/run/secrets/$secret" ]; then
    echo "Missing or empty release secret: $secret" >&2
    exit 1
  fi
done
for secret in discord_webhook_url store_information_initial_data; do
  if [ ! -f "/run/secrets/$secret" ]; then
    echo "Missing optional secret file: $secret" >&2
    exit 1
  fi
done

copy_secrets() {
  directory=$1
  owner=$2
  shift 2
  for secret do
    install -o "$owner" -g "$owner" -m 600 "/run/secrets/$secret" "$directory/$secret"
  done
  chown "$owner:$owner" "$directory"
  chmod 700 "$directory"
}
prepare_data() {
  chown -R "$2:$2" "$1"
  chmod 700 "$1"
}

copy_secrets /secrets/api 10001 jwt_secret bootstrap_admin_password encryption_key \
  discord_webhook_url store_information_initial_data
copy_secrets /secrets/garage 10002 garage_rpc_secret garage_access_key garage_secret_key
copy_secrets /secrets/litestream 10004 garage_credentials
copy_secrets /secrets/grafana 472 grafana_user grafana_password

prepare_data /var/lib/garage 10002
prepare_data /var/tempo 10007
prepare_data /loki 10008
prepare_data /prometheus 10009
prepare_data /var/lib/grafana 472

# Pre-create SQLite with shared write permissions; SQLite preserves this mode for its WAL.
touch /data/elysia.sqlite
chown -R 10001:10001 /data
find /data -type d -exec chmod 2770 {} +
find /data -type f -exec chmod 660 {} +
