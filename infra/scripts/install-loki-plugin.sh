#!/bin/sh
set -eu

architecture=$(docker info --format '{{.Architecture}}')

case "$architecture" in
  x86_64|amd64)
    digest=sha256:88f98af1110ba24b7b2eddad28ac445037327c712912aec3596b85702ea7b56f
    ;;
  aarch64|arm64)
    digest=sha256:c78bdbb26c5936e5d5258b8efa7a55e49e126a235461e9dc91ad455bebd9ef26
    ;;
  *)
    echo "Unsupported Docker architecture: $architecture" >&2
    exit 1
    ;;
esac

docker plugin install \
  --alias loki \
  "grafana/loki-docker-driver:3.7.0-$architecture"
  