#!/bin/bash

set -euo pipefail

# Start the test Supabase instance and write its auth keys into .env.test.
# Usage: tools/start_test_supabase.sh

HERE="$(realpath "${0}" | xargs dirname)"
ROOT="$HERE/.."

supabase start --workdir "$ROOT/supabase-test"

# Extract keys from the running test instance
eval "$(supabase status --workdir "$ROOT/supabase-test" -o env)"

sed -i "s|^NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=.*|NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=$ANON_KEY|" "$ROOT/.env.test"
sed -i "s|^SUPABASE_SECRET_KEY=.*|SUPABASE_SECRET_KEY=$SERVICE_ROLE_KEY|" "$ROOT/.env.test"

echo "Test Supabase started. Keys written to .env.test."
