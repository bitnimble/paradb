#!/bin/bash

# Local dev orchestrator. Boots a file-backed PGlite (under .fake_dev/pglite so data survives
# restarts), loads the schema + seed on first run, then runs `bun next dev` with stdout/stderr
# passed through. Uses the fake Supabase, dev S3, and fake Axiom, no Docker / live Supabase
# required. Mirrors `tools/test.sh` minus jest.
#
# `set -m` (job control) puts each backgrounded job in its own process group so cleanup can kill
# the whole subtree; `bun next dev` forks a worker that holds the port and would otherwise leak.
set -uom pipefail

# Optional --host/--port passed through to `bun next dev` so the dev server can bind a custom
# hostname/port (e.g. to expose it on the LAN). Both default to Next's own defaults when omitted.
NEXT_HOST=""
NEXT_PORT=""
while [ $# -gt 0 ]; do
  case "$1" in
    --host)
      NEXT_HOST="$2"
      shift 2
      ;;
    --port)
      NEXT_PORT="$2"
      shift 2
      ;;
    *)
      echo "Unknown argument: $1" >&2
      echo "Usage: tools/dev.sh [--host <host>] [--port <port>]" >&2
      exit 1
      ;;
  esac
done

# When a custom Next port is given (e.g. paseo injects $PASEO_PORT per worktree for isolation),
# point every self-referential URL at that port. The dev S3 handler and fake Supabase are served
# by Next itself, so they ride the Next port; left on :3000 they'd hit a different worktree. PGlite
# also needs its own port: a fixed offset can't stay disjoint from a worktree port range that spans
# most of the ephemeral space, so we let PGlite self-select a free one (--port 0) and read it back.
if [ -n "$NEXT_PORT" ]; then
  url_host="${NEXT_HOST:-localhost}"
  # 0.0.0.0 binds all interfaces but isn't routable as a URL; the app talks to itself via localhost.
  [ "$url_host" = "0.0.0.0" ] && url_host="localhost"
  base_url="http://$url_host:$NEXT_PORT"
  export NEXT_PUBLIC_BASE_URL="$base_url"
  export NEXT_PUBLIC_SUPABASE_URL="$base_url"
  export S3_ENDPOINT="$base_url/api/_dev/s3"
  export PUBLIC_S3_BASE_URL="$base_url/api/_dev/s3"
  PG_REQUESTED_PORT=0
fi

# Worktree mode self-selects (0); otherwise use the stable default so a manually-attached SQL
# client has a predictable port. The actual bound port is parsed from PGlite's log either way.
PG_REQUESTED_PORT="${PG_REQUESTED_PORT:-${PGPORT:-54398}}"
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
echo "Starting PGlite (requested port: $PG_REQUESTED_PORT, data: $PGLITE_DIR)"
node_modules/.bin/pglite-server --port "$PG_REQUESTED_PORT" --host 127.0.0.1 --max-connections 10 --db "$PGLITE_DIR" >| "$LOG_DIR/pglite.log" 2>&1 &
PGLITE_PID=$!

# pglite-server prints `... listening on {"port":NNNN,...}` once bound. Parse the real port from
# that line (it differs from the request when we asked for 0), then confirm it accepts connections.
echo "Waiting for PGlite to accept connections..."
PGPORT=""
PG_LISTEN_RE='listening on \{"port":([0-9]+)'
i=0
while true; do
  if [ -z "$PGPORT" ] && [[ "$(<"$LOG_DIR/pglite.log")" =~ $PG_LISTEN_RE ]]; then
    PGPORT="${BASH_REMATCH[1]}"
  fi
  if [ -n "$PGPORT" ] && bash -c "exec 3<>/dev/tcp/127.0.0.1/$PGPORT" 2>/dev/null; then
    break
  fi
  if ! kill -0 "$PGLITE_PID" 2>/dev/null; then
    echo "PGlite exited prematurely" >&2
    cat "$LOG_DIR/pglite.log" >&2
    exit 1
  fi
  if [ "$i" -ge $((PG_READY_TIMEOUT_SECONDS * 2)) ]; then
    echo "PGlite did not become ready within ${PG_READY_TIMEOUT_SECONDS}s" >&2
    cat "$LOG_DIR/pglite.log" >&2
    exit 1
  fi
  sleep 0.5
  i=$((i + 1))
done
# Downstream consumers (schema loader, Next) connect via $PGPORT, so publish the resolved port.
export PGPORT
echo "PGlite ready on port $PGPORT"

# Idempotent: tools/load_schema.ts skips if the `maps` table already exists, so subsequent runs
# against the same PGlite directory don't re-seed or clobber dev data.
echo "Loading schema (if needed)..."
bun tools/load_schema.ts

echo "Starting Next.js dev server..."
NEXT_ARGS=()
[ -n "$NEXT_HOST" ] && NEXT_ARGS+=(--hostname "$NEXT_HOST")
[ -n "$NEXT_PORT" ] && NEXT_ARGS+=(--port "$NEXT_PORT")
# Backgrounded + wait so the EXIT trap can kill the whole process group (negative PID with set -m).
# `bun next dev` forks a worker that holds the port and would leak if we just killed bash on Ctrl-C.
bun next dev ${NEXT_ARGS[@]+"${NEXT_ARGS[@]}"} &
NEXT_PID=$!
wait "$NEXT_PID"
