#!/usr/bin/env bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
project=ocazbike-falco
test_container="falco-smoke-$(date +%s)-$$"

cleanup() {
  docker rm -f "$test_container" >/dev/null 2>&1 || true
}
trap cleanup EXIT

bash "$ROOT/infra/scripts/start-falco.sh"
falco_id=$(docker ps -q --filter "label=com.docker.compose.project=$project" \
  --filter "label=com.docker.compose.service=falco")
if [[ ! "$falco_id" =~ ^[0-9a-f]{12}$ ]]; then
  echo "Expected exactly one running Falco container." >&2
  exit 1
fi
since=$(date -u +%Y-%m-%dT%H:%M:%SZ)
docker run -d --name "$test_container" --network none alpine:3.22 sleep 120 >/dev/null
sleep 5
docker exec -t "$test_container" /bin/sh -c true "$test_container"

for attempt in {1..30}; do
  if docker logs --since "$since" "$falco_id" 2>&1 |
    grep -F 'Terminal shell in container' | grep -F "$test_container" >/dev/null; then
    echo "Falco detected $test_container. Confirm the matching alert in Discord."
    exit 0
  fi
  sleep 1
done

echo "Falco did not report the test shell. Check the Falco logs and host eBPF prerequisites." >&2
docker logs --since "$since" --tail 80 "$falco_id" >&2
exit 1
