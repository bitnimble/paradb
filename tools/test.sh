#!/bin/bash

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
TEST_DB="paradb_test"
POSTGRES_USER="postgres"

# Clean out test db
dropdb --if-exists "$TEST_DB" 2>&1 >/dev/null
createdb  "$TEST_DB" 2>&1 >/dev/null
psql -q -d "$TEST_DB" -f "$SCRIPT_DIR/../db/init.sql"
psql -q -d "$TEST_DB" -f "$SCRIPT_DIR/../db/fake_data.sql"

# Reinitialise search index
ENV_FILE=.env.test yarn migrate src/_migrations/rebuild_meilisearch.ts

# Run tests
ENV_FILE=.env.test yarn jest
