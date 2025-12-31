#!/bin/bash

set -euo pipefail

HERE="$(realpath "${0}" | xargs dirname)"

# Reinitialise meilisearch
yarn search:rebuild
yarn next start
