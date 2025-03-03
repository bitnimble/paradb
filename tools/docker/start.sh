#!/bin/bash

set -euo pipefail

HERE="$(realpath "${0}" | xargs dirname)"

. "$HERE/db.sh"

init_db
# Reinitialise meilisearch
yarn search:rebuild
yarn next start
