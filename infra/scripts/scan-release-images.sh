#!/usr/bin/env bash
set -euo pipefail

images=(ocazbike-api:release ocazbike-spa:release ocazbike-garage:release)

if ! command -v trivy >/dev/null 2>&1; then
  echo "Trivy is required to scan release images; install the Trivy CLI on this host." >&2
  exit 1
fi

for image in "${images[@]}"; do
  if ! docker image inspect "$image" >/dev/null 2>&1; then
    echo "Release image is missing: $image. Build the release images first." >&2
    exit 1
  fi

  trivy image --image-src docker --scanners vuln,secret --exit-code 1 --severity HIGH,CRITICAL "$image"
done
