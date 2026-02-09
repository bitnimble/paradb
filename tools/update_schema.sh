#!/bin/bash

set -euo pipefail

HERE="$(realpath "${0}" | xargs dirname)"

set -a; source "$HERE/../.env.localdev"; set +a
bun zapatos
bun supabase gen types typescript --local > "$HERE/../src/services/db/db.types.ts"
