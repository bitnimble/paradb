#!/bin/bash

# Full-stack E2E orchestrator. Assumes the Supabase stack is already running (`supabase start`),
# then: pulls the live Supabase keys into the env, brings up Minio as a real S3, provisions the
# bucket, and runs Playwright (which boots `bun next dev` itself via its webServer config).
#
# Invoked as `dotenv -e .env.e2e -- bash tools/e2e.sh` (see the test:e2e script), so the static
# .env.e2e vars are already in the environment; we only layer the runtime Supabase keys on top.
set -uo pipefail

COMPOSE_FILE="docker/docker-compose.e2e.yml"
MINIO_HEALTH_URL="http://localhost:9000/minio/health/live"
MINIO_READY_TIMEOUT_SECONDS=60

# Always tear Minio down (container + volume), even on failure/crash/Ctrl-C, so no uploaded-map
# state survives between runs. The Supabase DB is intentionally left alone: this script treats it as
# an externally-owned, already-running service, so re-runs rely on process-unique signup
# usernames/emails (see e2e/helpers/auth.ts) rather than resetting someone's local data.
cleanup() {
  echo "Tearing down Minio..."
  docker compose -f "$COMPOSE_FILE" down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

# Prefer a `supabase` on PATH (CI installs it via setup-cli); fall back to the bun-global binary the
# repo's AGENTS.md documents (`bun supabase ...`).
if command -v supabase >/dev/null 2>&1; then
  SUPABASE="supabase"
else
  SUPABASE="bun supabase"
fi

# Require the Supabase stack to be up. `status` exits non-zero when it isn't.
if ! $SUPABASE status >/dev/null 2>&1; then
  echo "Supabase is not running. Start it first with: $SUPABASE start" >&2
  exit 1
fi

# Inject the live local keys so .env.e2e never goes stale against the CLI's generated keys. `set -a`
# auto-exports the `NAME="value"` assignments that `status -o env` prints.
set -a
eval "$($SUPABASE status -o env)"
set +a
# Newer CLIs expose PUBLISHABLE_KEY/SECRET_KEY; older ones ANON_KEY/SERVICE_ROLE_KEY. The nested
# `:-` defaults keep `set -u` happy when only one naming is present.
export NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="${PUBLISHABLE_KEY:-${ANON_KEY:-}}"
export SUPABASE_SECRET_KEY="${SECRET_KEY:-${SERVICE_ROLE_KEY:-}}"
if [ -z "$NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY" ] || [ -z "$SUPABASE_SECRET_KEY" ]; then
  echo "Could not read Supabase keys from '$SUPABASE status -o env'" >&2
  exit 1
fi

# Bring up Minio (real S3) and wait for it to answer on the host. We poll ourselves rather than rely
# on the container healthcheck, since recent minio images ship without curl.
echo "Starting Minio..."
docker compose -f "$COMPOSE_FILE" up -d minio

echo "Waiting for Minio to be ready..."
i=0
until curl --output /dev/null --silent --fail "$MINIO_HEALTH_URL"; do
  if [ "$i" -ge "$MINIO_READY_TIMEOUT_SECONDS" ]; then
    echo "Minio did not become ready within ${MINIO_READY_TIMEOUT_SECONDS}s" >&2
    docker compose -f "$COMPOSE_FILE" logs minio >&2
    exit 1
  fi
  sleep 1
  i=$((i + 1))
done

echo "Provisioning Minio bucket..."
bun tools/e2e_setup_s3.ts || exit 1

echo "Running Playwright E2E tests..."
bun playwright test
TEST_EXIT=$?
exit "$TEST_EXIT"
