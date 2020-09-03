#!/bin/bash

# Exports environment variables from given files in the form of `key=value` pairs.
# Usage: . export_env.sh file1 file2

set -e

for FILE in "$@"; do
  if [ -f $FILE ]; then
    set -a
    . $FILE
    set +a
  else
    echo "'$FILE' does not exist."
  fi
done
