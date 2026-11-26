#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR/.."

restore_path="/data/backup-restore-check-$$.sqlite"
compose_file="${COMPOSE_FILE:-compose.yaml}"
da_dir=$(CDPATH= cd -- "$SCRIPT_DIR/../../da" && pwd)
local_restore_path="$da_dir/data/backup-restore-check-$$.sqlite"

compose() {
  if [ "$compose_file" = "compose.release.yaml" ]; then
    docker compose --env-file ../da/.env -f "$compose_file" "$@"
  else
    LOCAL_UID="${LOCAL_UID:-$(id -u)}" LOCAL_GID="${LOCAL_GID:-$(id -g)}" \
      docker compose --profile backup --env-file ../da/.env -f "$compose_file" "$@"
  fi
}

run_bun() {
  script=$1
  if [ "$compose_file" = "compose.release.yaml" ]; then
    compose exec -T -e "RESTORE_PATH=$restore_path" api bun -e "$script"
  else
    (cd "$da_dir" && RESTORE_PATH="$local_restore_path" bun -e "$script")
  fi
}

cleanup() {
  run_bun '
    import { rmSync } from "node:fs";
    const path = process.env.RESTORE_PATH;
    for (const suffix of ["", "-wal", "-shm", "-journal"]) {
      rmSync(`${path}${suffix}`, { force: true });
    }
  ' || echo "Warning: could not remove temporary restored database $restore_path" >&2
}

trap cleanup 0
trap 'exit 1' HUP INT TERM

if [ "$compose_file" != "compose.release.yaml" ] &&
  [ ! -f "$da_dir/data/elysia.sqlite" ]; then
  echo "Start the local API once to create da/data/elysia.sqlite before verifying backups." >&2
  exit 1
fi

compose up -d litestream

echo "Restoring the latest Litestream replica to a temporary database..."
compose exec -T litestream litestream restore \
  -config /etc/litestream.yml \
  -integrity-check quick \
  -o "$restore_path" \
  /data/elysia.sqlite

echo "Checking restored SQLite integrity and required tables..."
run_bun '
  import { Database } from "bun:sqlite";
  const database = new Database(process.env.RESTORE_PATH, { readonly: true });
  try {
    const result = database.query("PRAGMA quick_check").get();
    if (result?.quick_check !== "ok") {
      throw new Error(`SQLite quick_check failed: ${JSON.stringify(result)}`);
    }

    const tables = new Set(
      database
        .query("SELECT name FROM sqlite_master WHERE type = '\''table'\''")
        .all()
        .map((row) => row.name),
    );
    for (const table of ["users", "support_requests", "__drizzle_migrations"]) {
      if (!tables.has(table)) {
        throw new Error(`Restored database is missing table ${table}`);
      }
    }
  } finally {
    database.close();
  }
'

echo "Backup restore verification passed."
