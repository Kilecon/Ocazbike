#!/bin/sh
set -eu

architecture=$(docker info --format '{{.Architecture}}')

case "$architecture" in
  x86_64|amd64)
    architecture=amd64
    digest=sha256:554ed4f6b826e5cba037cbc5dd5192de4480ed845964101be3e99a605b3c2158
    ;;
  aarch64|arm64)
    architecture=arm64
    digest=sha256:4f9d0b264f9e6746a4c52c09df4103b4533e00d828261ac9b1de2cd99df097b1
    ;;
  *)
    echo "Unsupported Docker architecture: $architecture" >&2
    exit 1
    ;;
esac

docker plugin install \
  --alias loki \
  "grafana/loki-docker-driver:3.7.0-$architecture@$digest"