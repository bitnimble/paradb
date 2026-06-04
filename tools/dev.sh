#!/bin/bash

# Local dev orchestrator. Boots a file-backed PGlite (under .fake_dev/pglite so data survives
# restarts), loads the schema + seed on first run, then runs `bun next dev` with stdout/stderr
# passed through. Uses the fake Supabase, dev S3, and fake Axiom, no Docker / live Supabase
# required. Mirrors `tools/test.sh` minus jest.
#
# `set -m` (job control) puts each backgrounded job in its own process group so cleanup can kill
# the whole subtree; `bun next dev` forks a worker that holds the port and would otherwise leak.
set -uom pipefail

PGPORT="${PGPORT:-54398}"
FAKE_DEV_DIR="${FAKE_DEV_DIR:-.fake_dev}"
PGLITE_DIR="${PGLITE_DIR:-$FAKE_DEV_DIR/pglite}"
LOG_DIR="$(mktemp -d)"
PG_READY_TIMEOUT_SECONDS=30

mkdir -p "$FAKE_DEV_DIR"

PGLITE_PID=""
NEXT_PID=""
cleanup() {
  [ -n "$NEXT_PID" ] && kill -TERM "-$NEXT_PID" 2>/dev/null || true
  [ -n "$PGLITE_PID" ] && kill -TERM "-$PGLITE_PID" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

# File-backed PGlite so accounts/maps you create in dev survive restarts. -m >1 because Next dev
# opens its own connection pool and the schema loader opens a second one at startup.
echo "Starting PGlite on port $PGPORT (data: $PGLITE_DIR)"
node_modules/.bin/pglite-server --port "$PGPORT" --host 127.0.0.1 --max-connections 10 --db "$PGLITE_DIR" >| "$LOG_DIR/pglite.log" 2>&1 &
PGLITE_PID=$!

echo "Waiting for PGlite to accept connections..."
i=0
until bash -c "exec 3<>/dev/tcp/127.0.0.1/$PGPORT" 2>/dev/null; do
  if ! kill -0 "$PGLITE_PID" 2>/dev/null; then
    echo "PGlite exited prematurely" >&2
    cat "$LOG_DIR/pglite.log" >&2
    exit 1
  fi
  if [ "$i" -ge $((PG_READY_TIMEOUT_SECONDS * 2)) ]; then
    echo "PGlite did not open the socket within ${PG_READY_TIMEOUT_SECONDS}s" >&2
    cat "$LOG_DIR/pglite.log" >&2
    exit 1
  fi
  sleep 0.5
  i=$((i + 1))
done
exec 3>&- 2>/dev/null || true

# Idempotent: tools/load_schema.ts skips if the `maps` table already exists, so subsequent runs
# against the same PGlite directory don't re-seed or clobber dev data.
echo "Loading schema (if needed)..."
bun tools/load_schema.ts

echo "Starting Next.js dev server..."
# Backgrounded + wait so the EXIT trap can kill the whole process group (negative PID with set -m).
# `bun next dev` forks a worker that holds the port and would leak if we just killed bash on Ctrl-C.
bun next dev -p 5174 &
NEXT_PID=$!
wait "$NEXT_PID"
