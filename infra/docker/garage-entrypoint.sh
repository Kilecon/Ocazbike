#!/bin/sh
set -eu
GARAGE_DEFAULT_ACCESS_KEY=$(cat /run/secrets/garage_access_key)
GARAGE_DEFAULT_SECRET_KEY=$(cat /run/secrets/garage_secret_key)
test -n "$GARAGE_DEFAULT_ACCESS_KEY"
test -n "$GARAGE_DEFAULT_SECRET_KEY"
export GARAGE_DEFAULT_ACCESS_KEY GARAGE_DEFAULT_SECRET_KEY
exec "$@"
