#!/bin/bash

set -euo pipefail

HERE="$(realpath "${0}" | xargs dirname)"
DB="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE"

# Initialise psql if not done yet
echo "db connection string"
echo "$DB"

if psql -U paradb -c "select * from pg_tables where schemaname = 'public' and tablename = 'maps';" | head -n 3 | tail -n 1 | cut -d \| -f 2 | grep -qw maps; then
  echo "Found paradb database in postgres; skipping initialization..."
else
  echo "Could not find paradb database in postgres; initializing..."
  echo "Dropping db"
  dropdb "$PGDATABASE" -w
  echo "Creating db"
  createdb "$PGDATABASE" -w
  echo "Running schema init script"
  psql -d "$DB" -f "$HERE/../db/init.sql"
  echo "Done."
fi

# Reinitialise meilisearch
yarn search:rebuild
yarn next start
