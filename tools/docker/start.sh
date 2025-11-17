#!/bin/bash

set -euo pipefail

HERE="$(realpath "${0}" | xargs dirname)"

sleep 5

# Reinitialise meilisearch
yarn search:rebuild
yarn next build
yarn next start
