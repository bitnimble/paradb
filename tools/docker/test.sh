#!/bin/bash

set -euo pipefail

HERE="$(realpath "${0}" | xargs dirname)"
DB="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE"

init_db () {
  echo "Dropping db"
  dropdb "$PGDATABASE" -w
  echo "Creating db"
  createdb "$PGDATABASE" -w
  echo "Running schema init script"
  psql -d "$DB" -f "$HERE/../../db/init.sql"
  echo "Done."
}

init_db

echo "Starting server"
bun next dev &

until curl --output /dev/null --silent --head --fail "$BASE_URL"; do
    printf 'Waiting for server to start...\n'
    sleep 1
done

echo "Running tests"
bun jest --config jest.config.integration.ts --runInBand
