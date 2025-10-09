#!/bin/bash

# Load environment variables from ./apps/server/.env
ENV_PATH="./apps/server/.env"
if [ -f "$ENV_PATH" ]; then
  export $(grep -v '^#' "$ENV_PATH" | xargs)
fi

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
  echo "Error: DATABASE_URL environment variable is not set"
  exit 1
fi

# Check if backup file is provided
if [ -z "$1" ]; then
  echo "Error: Please provide the backup file path as an argument"
  echo "Usage: ./restore-db.sh <backup_file.sql>"
  exit 1
fi

BACKUP_FILE="$1"

# Check if backup file exists
if [ ! -f "$BACKUP_FILE" ]; then
  echo "Error: Backup file '$BACKUP_FILE' does not exist"
  exit 1
fi

# Run psql to restore
echo "Restoring database from: $BACKUP_FILE"
psql -d "$DATABASE_URL" < "$BACKUP_FILE"

if [ $? -eq 0 ]; then
  echo "Restore completed successfully"
else
  echo "Error: Restore failed"
  exit 1
fi