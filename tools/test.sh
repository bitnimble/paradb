#!/bin/bash

# No `set -e`: we capture Jest's exit code explicitly below so server logs can be printed on
# failure before exiting. `set -m` (job control) puts each backgrounded job in its own process
# group, so cleanup can kill the whole subtree; `bun next dev` forks a worker that holds the port
# and would otherwise leak.
set -uom pipefail

PGPORT="${PGPORT:-54399}"
BASE_URL="${NEXT_PUBLIC_BASE_URL:-http://localhost:3000}"
LOG_DIR="$(mktemp -d)"
PG_READY_TIMEOUT_SECONDS=30
NEXT_READY_TIMEOUT_SECONDS=120

PGLITE_PID=""
NEXT_PID=""
cleanup() {
  # Kill the whole process group (negative PID) so any children `bun next dev` forked go with it.
  [ -n "$NEXT_PID" ] && kill -TERM "-$NEXT_PID" 2>/dev/null || true
  [ -n "$PGLITE_PID" ] && kill -TERM "-$PGLITE_PID" 2>/dev/null || true
}
trap cleanup EXIT

# Ephemeral in-memory Postgres (PGlite) over a socket. -m >1 is required: the Next dev server and
# Jest each open their own connection pool, and the default (1) would deadlock the second one. The
# schema is loaded by Jest's global setup; data is seeded per-test.
echo "Starting PGlite server on port $PGPORT"
node_modules/.bin/pglite-server --port "$PGPORT" --host 127.0.0.1 --max-connections 10 --db memory:// >| "$LOG_DIR/pglite.log" 2>&1 &
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
# Socket-open ≠ protocol-ready; the first SELECT can still race PGlite's startup. globalSetup
# retries connection errors when loading the schema (see jest_global_setup.integration.ts).

echo "Starting server"
bun next dev >| "$LOG_DIR/next.log" 2>&1 &
NEXT_PID=$!

# No --fail: we only need the server to respond. DB-backed pages 500 until Jest's global setup loads
# the schema, which is fine; the tests hit /api endpoints, not pages.
echo "Waiting for Next dev to start..."
i=0
until curl --output /dev/null --silent --head "$BASE_URL"; do
  if ! kill -0 "$NEXT_PID" 2>/dev/null; then
    echo "Next dev exited prematurely" >&2
    cat "$LOG_DIR/next.log" >&2
    exit 1
  fi
  if [ "$i" -ge "$NEXT_READY_TIMEOUT_SECONDS" ]; then
    echo "Next dev did not become reachable within ${NEXT_READY_TIMEOUT_SECONDS}s" >&2
    cat "$LOG_DIR/next.log" >&2
    exit 1
  fi
  sleep 1
  i=$((i + 1))
done

echo "Running tests"
# Jest writes to a file we then print: piped through `bun run`, Jest's process.exit() can drop
# buffered stdout, so a direct file write is the reliable way to capture its full output.
bun jest --config jest.config.integration.ts --runInBand >| "$LOG_DIR/jest.log" 2>&1
JEST_EXIT=$?
cat "$LOG_DIR/jest.log"
if [ "$JEST_EXIT" -ne 0 ]; then
  echo "=== PGlite log ==="
  cat "$LOG_DIR/pglite.log"
  echo "=== Next dev log ==="
  cat "$LOG_DIR/next.log"
fi
exit "$JEST_EXIT"
