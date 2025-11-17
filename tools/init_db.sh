#!/bin/bash

set -euo pipefail

HERE="$(realpath "${0}" | xargs dirname)"
DB="postgresql://$PGUSER:$PGPASSWORD@$PGHOST:$PGPORT/$PGDATABASE"

init() {
  echo "Dropping db"
  dropdb "$PGDATABASE" -w
  echo "Creating db"
  createdb "$PGDATABASE" -w
  echo "Running schema init script"
  psql -d "$DB" -f "$HERE/../db/init.sql"
  echo "Done."
}

read -r -p "This will completely destroy and recreate the database. Are you sure? [y/N] " response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
then
  init
else
  echo "Doing nothing, exiting"
fi
