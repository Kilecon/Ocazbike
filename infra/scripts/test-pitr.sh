#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
cd "$SCRIPT_DIR/.."

test_id="pitr-test-$(date -u +%Y%m%dT%H%M%SZ)-$$"
database_path="/data/${test_id}.sqlite"
replica_path="/data/${test_id}-replica"
config_path="/data/${test_id}.yml"
restore_path="/data/${test_id}-restored.sqlite"
target_timestamp=""

compose() {
  docker compose --env-file ../da/.env -f compose.yaml "$@"
}

run_api_bun() {
  compose exec -T \
    -e "DATABASE_PATH=$database_path" \
    -e "CONFIG_PATH=$config_path" \
    -e "REPLICA_PATH=$replica_path" \
    -e "RESTORE_PATH=$restore_path" \
    -e "TARGET_TIMESTAMP=$target_timestamp" \
    api bun -e "$1"
}

cleanup() {
  run_api_bun '
    import { rmSync } from "node:fs";
    for (const path of [
      process.env.DATABASE_PATH,
      `${process.env.DATABASE_PATH}-wal`,
      `${process.env.DATABASE_PATH}-shm`,
      `${process.env.DATABASE_PATH}-journal`,
      process.env.CONFIG_PATH,
      process.env.REPLICA_PATH,
      process.env.RESTORE_PATH,
      `${process.env.RESTORE_PATH}-wal`,
      `${process.env.RESTORE_PATH}-shm`,
      `${process.env.RESTORE_PATH}-journal`,
    ]) {
      rmSync(path, { recursive: true, force: true });
    }
  ' || echo "Warning: could not clean PITR test files from the SQLite volume." >&2
}

trap cleanup 0
trap 'exit 1' HUP INT TERM

echo "Creating an isolated SQLite database and local Litestream replica..."
run_api_bun '
  import { Database } from "bun:sqlite";
  import { writeFileSync } from "node:fs";

  const database = new Database(process.env.DATABASE_PATH);
  database.exec(`
    PRAGMA journal_mode = WAL;
    CREATE TABLE pitr_test_state (
      id INTEGER PRIMARY KEY,
      state TEXT NOT NULL
    );
    INSERT INTO pitr_test_state (id, state) VALUES (1, "baseline");
  `);
  database.close();

  writeFileSync(
    process.env.CONFIG_PATH,
    `dbs:
  - path: ${process.env.DATABASE_PATH}
    replicas:
      - url: file://${process.env.REPLICA_PATH}
sync-interval: 1s
snapshot:
  interval: 24h
`,
  );
'

replicate_snapshot() {
  compose exec -T litestream litestream replicate \
    -config "$config_path" \
    -once \
    -force-snapshot
}

set_state() {
  compose exec -T \
    -e "DATABASE_PATH=$database_path" \
    -e "STATE_ID=$1" \
    -e "STATE_VALUE=$2" \
    api bun -e '
    import { Database } from "bun:sqlite";
    const database = new Database(process.env.DATABASE_PATH);
    database
      .query("INSERT INTO pitr_test_state (id, state) VALUES (?, ?)")
      .run(Number(process.env.STATE_ID), process.env.STATE_VALUE);
    database.close();
  '
}

echo "Replicating baseline, checkpoint A, then checkpoint B..."
replicate_snapshot
sleep 2
set_state 2 checkpoint-a
replicate_snapshot
sleep 2
set_state 3 checkpoint-b
replicate_snapshot

ltx_json=$(
  compose exec -T litestream litestream ltx \
    -config "$config_path" \
    -level 0 \
    -json \
    "$database_path"
)

target_timestamp=$(
  LTX_JSON="$ltx_json" bun -e '
    const files = JSON.parse(process.env.LTX_JSON)
      .sort((left, right) => left.timestamp.localeCompare(right.timestamp));
    if (files.length < 3) {
      throw new Error(`Expected 3 retained L0 files, found ${files.length}`);
    }
    const checkpointA = Date.parse(files[1].timestamp);
    const checkpointB = Date.parse(files[2].timestamp);
    const target = checkpointA + 1000;
    if (target >= checkpointB) {
      throw new Error("LTX timestamps are too close for a PITR boundary test");
    }
    console.log(new Date(target).toISOString());
  '
)

echo "Restoring to $target_timestamp (after A, before B)..."
compose exec -T litestream litestream restore \
  -config "$config_path" \
  -timestamp "$target_timestamp" \
  -integrity-check quick \
  -o "$restore_path" \
  "$database_path"

echo "Verifying the restored state contains A but not B..."
run_api_bun '
  import { Database } from "bun:sqlite";
  const database = new Database(process.env.RESTORE_PATH, { readonly: true });
  try {
    const result = database.query("PRAGMA quick_check").get();
    if (result?.quick_check !== "ok") {
      throw new Error(`SQLite quick_check failed: ${JSON.stringify(result)}`);
    }
    const states = database
      .query("SELECT state FROM pitr_test_state ORDER BY id")
      .all()
      .map((row) => row.state);
    const expected = ["baseline", "checkpoint-a"];
    if (JSON.stringify(states) !== JSON.stringify(expected)) {
      throw new Error(
        `Unexpected restored states: ${JSON.stringify(states)}; expected ${JSON.stringify(expected)}`,
      );
    }
  } finally {
    database.close();
  }
'

echo "PITR test passed: baseline and checkpoint A restored; checkpoint B excluded."
