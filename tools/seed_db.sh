#!/bin/bash

set -euo pipefail

HERE="$(realpath "${0}" | xargs dirname)"

echo "Importing fake data"
psql -d paradb -f "$HERE/../db/fake_data.sql"
