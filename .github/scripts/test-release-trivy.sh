#!/usr/bin/env bash
set -euo pipefail

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
temporary=$(mktemp -d)
cleanup() {
  rm -f "$temporary/bin/docker" "$temporary/bin/trivy" "$temporary/scans" "$temporary/warnings"
  rmdir "$temporary/bin" "$temporary"
}
trap cleanup EXIT
mkdir "$temporary/bin"

cat > "$temporary/bin/docker" <<'STUB'
#!/usr/bin/env bash
[[ "$1" == image && "$2" == inspect && "$3" == ocazbike-* ]] || exit 2
STUB
cat > "$temporary/bin/trivy" <<'STUB'
#!/usr/bin/env bash
[[ "$1 $2 $3 $4 $5 $6 $7 $8 $9" == \
  'image --image-src docker --scanners vuln,secret --exit-code 1 --severity HIGH,CRITICAL' ]] || exit 2
for image do last=$image; done
printf '%s\n' "$last" >> "$SCAN_LOG"
[[ "$last" != "$FAIL_IMAGE" ]]
STUB
chmod +x "$temporary/bin/docker" "$temporary/bin/trivy"

PATH="$temporary/bin:$PATH" SCAN_LOG="$temporary/scans" \
  bash "$ROOT/infra/scripts/scan-release-images.sh"
expected=$'ocazbike-api:release\nocazbike-spa:release\nocazbike-garage:release'
[[ "$(cat "$temporary/scans")" == "$expected" ]]

: > "$temporary/scans"
PATH="$temporary/bin:$PATH" SCAN_LOG="$temporary/scans" FAIL_IMAGE=ocazbike-garage:release \
  bash "$ROOT/infra/scripts/scan-release-images.sh" > "$temporary/warnings"
[[ "$(cat "$temporary/scans")" == "$expected" ]]
grep -Fq \
  '::warning::Trivy found HIGH or CRITICAL issues in ocazbike-garage:release' \
  "$temporary/warnings"

for blocking_image in ocazbike-api:release ocazbike-spa:release; do
  : > "$temporary/scans"
  if PATH="$temporary/bin:$PATH" SCAN_LOG="$temporary/scans" FAIL_IMAGE="$blocking_image" \
    bash "$ROOT/infra/scripts/scan-release-images.sh"; then
    echo "Release image scanning succeeded despite a Trivy finding in $blocking_image." >&2
    exit 1
  fi
  case "$blocking_image" in
    ocazbike-api:release) expected=ocazbike-api:release ;;
    ocazbike-spa:release) expected=$'ocazbike-api:release\nocazbike-spa:release' ;;
  esac
  [[ "$(cat "$temporary/scans")" == "$expected" ]]
done

echo "Release image scanning tests passed: third-party findings warn, application findings block deployment."
