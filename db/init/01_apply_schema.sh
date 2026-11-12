#!/bin/sh
set -e
for db in "$POSTGRES_DB" aocc_test; do
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$db" -f /docker-entrypoint-initdb.d/sql/schema.sql
done
