#!/bin/bash

set -euo pipefail

# shellcheck source=/dev/null
source "/.paradb-deps"

yarn

buildkite-agent artifact download .next.tar.gz .
tar -xzvf .next.tar.gz

yarn start &
nohup meilisearch --no-analytics --master-key="123" > /dev/null 2>&1 &
nohup minio server /data > /dev/null 2>&1 &
yarn test

pkill -f "sh -c next start"
pkill -f ".bin/next start"
pkill -f "next-router-worker"
pkill -f "next/dist/compiled"
pkill -f "meilisearch"
pkill -f "minio"
