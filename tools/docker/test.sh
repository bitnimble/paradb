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

echo "Clearing local S3"
mc alias set local http://minio:9000 minioadmin minioadmin
mc admin user add local "$S3_ACCESS_KEY_ID" "$S3_ACCESS_KEY_SECRET" || true
mc rb --force local/"$S3_MAPS_BUCKET" || true
mc mb local/"$S3_MAPS_BUCKET"
mc admin policy attach local readwrite --user "$S3_ACCESS_KEY_ID" || true

yarn search:rebuild

echo "Starting server"
yarn next dev &

until curl --output /dev/null --silent --head --fail "$BASE_URL"; do
    printf 'Waiting for server to start...\n'
    sleep 1
done

echo "Running tests"
yarn jest --runInBand
