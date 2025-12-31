#!/bin/bash

set -euo pipefail

HERE="$(realpath "${0}" | xargs dirname)"

set -a; source "$HERE/../.env.localdevelopment"; set +a
yarn zapatos
yarn supabase gen types typescript --local > "$HERE/../src/services/db/db.types.ts"
