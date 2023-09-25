#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
REPO="$SCRIPT_DIR/../"
TEST_DB="paradb_test"

echo "Cleaning out test database"
sudo -u postgres -- dropdb --if-exists "${TEST_DB}" 2>&1 >/dev/null
sudo -u postgres -- createdb  "${TEST_DB}" 2>&1 >/dev/null
sudo -u postgres -- psql -q -d "${TEST_DB}" -f "$REPO/db/init.sql"

echo "Rebuilding search index"
ENV_FILE=.env.test bun "$REPO/src/services/_migrations/rebuild_meilisearch.ts" || exit

echo "Clearing local S3"
mc alias set local http://127.0.0.1:9000 minioadmin minioadmin
mc admin user add local abc 12345678
mc rb local/paradb-maps-test
mc mb local/paradb-maps-test
mc admin policy attach local readwrite --user abc

# Run tests
echo "Running tests"
ENV_FILE=.env.test yarn jest --runInBand
