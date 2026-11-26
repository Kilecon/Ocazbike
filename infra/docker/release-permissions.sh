#!/bin/sh
set -eu
umask 077

prepare_data() {
  local directory=$1 owner=$2
  chown -R "$owner:$owner" "$directory"
  chmod 700 "$directory"
}

prepare_data /var/lib/garage 10002
prepare_data /var/tempo 10007
prepare_data /loki 10008
prepare_data /prometheus 10009
prepare_data /var/lib/grafana 472

# Both SQLite clients use group 10001, so group write permission is sufficient.
touch /data/elysia.sqlite
chown -R 10001:10001 /data
find /data -type d -exec chmod 770 {} +
find /data -type f -exec chmod 660 {} +
