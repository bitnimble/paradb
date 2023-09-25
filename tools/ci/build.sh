#!/bin/bash

# shellcheck source=/dev/null
source "/.paradb-deps"

echo "Installing node_modules"
yarn --force

echo "Building"
cp .env.test .env
yarn build

echo "Finished build"
