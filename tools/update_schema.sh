#!/bin/bash

set -euo pipefail

HERE="$(realpath "${0}" | xargs dirname)"

export PGHOST=127.0.0.1
export PGPORT=54322
export PGUSER=postgres
export PGDATABASE=postgres
export PGPASSWORD=postgres

bun zapatos
supabase gen types typescript --local > "$HERE/../src/services/db/db.types.ts"
