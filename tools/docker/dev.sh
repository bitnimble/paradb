#!/bin/bash

set -euo pipefail

HERE="$(realpath "${0}" | xargs dirname)"

. "$HERE/db.sh"

init_db
yarn search:rebuild
yarn next dev
