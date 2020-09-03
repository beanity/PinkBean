#!/bin/bash

set -e

function create_database() {
  local db=$1
  echo "Creating database '$db'"
  psql -U $POSTGRES_USER <<-EOSQL
    CREATE DATABASE $db;
EOSQL
}

databases=( "bot_dev" "bot_qa" "bot_prod" )

for i in ${databases[@]}; do
  create_database $i
done
