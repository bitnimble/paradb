#!/bin/bash

set -euo pipefail

# shellcheck source=/dev/null
source "/.paradb-deps"

yarn
cp .env.test .env

buildkite-agent artifact download .next.tar.gz .
tar -xzf .next.tar.gz

{
  yarn start &
  nohup meilisearch --no-analytics --master-key="123" > /dev/null 2>&1 &

  nohup minio server /data > /dev/null 2>&1 &
  yarn test
} || {
  pkill -f "sh -c next start" || true
  pkill -f ".bin/next start" || true
  pkill -f "next-router-worker" || true
  pkill -f "next/dist/compiled" || true
  pkill -f "meilisearch" || true
  pkill -f "minio" || true
}
