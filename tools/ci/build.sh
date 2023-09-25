#!/bin/bash

set -euo pipefail

# shellcheck source=/dev/null
source "/.paradb-deps"

echo "Installing node_modules"
yarn --force

echo "Building"
cp .env.test .env
yarn build

tar -czf .next.tar.gz .next
buildkite-agent artifact upload .next.tar.gz

echo "Finished build"
