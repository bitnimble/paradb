#!/bin/bash

set -euo pipefail

HERE="$(realpath "${0}" | xargs dirname)"

init() {
  echo "Dropping db"
  dropdb paradb
  echo "Creating db"
  createdb paradb
  echo "Running schema init script"
  psql -d paradb -f "$HERE/../db/init.sql"
  echo "Importing fake data"
  psql -d paradb -f "$HERE/../db/fake_data.sql"
}

read -r -p "This will completely destroy and recreate the database. Are you sure? [y/N] " response
if [[ "$response" =~ ^([yY][eE][sS]|[yY])$ ]]
then
  init
else
  echo "Doing nothing, exiting"
fi
