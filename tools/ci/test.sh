#!/bin/bash

set -euo pipefail

# shellcheck source=/dev/null
source "/.paradb-deps"

yarn

buildkite-agent artifact download .next.tar.gz .next.tar.gz
tar -xzvf .next.tar.gz

yarn start &
yarn test

pkill -f "sh -c next start"
pkill -f ".bin/next start"
pkill -f "next-router-worker"
pkill -f "next/dist/compiled"
