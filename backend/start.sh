#!/bin/bash
set -e

echo "Generating config.json from environment variables..."

# Replace variables in config.json template
cat /app/config-template.json | \
  sed "s|\${API_KEY}|${API_KEY}|g" | \
  sed "s|\${MODEL}|${MODEL}|g" | \
  sed "s|\${DB_HOST}|${DB_HOST}|g" | \
  sed "s|\${DB_PORT}|${DB_PORT}|g" | \
  sed "s|\${DB_USER}|${DB_USER}|g" | \
  sed "s|\${DB_PASSWORD}|${DB_PASSWORD}|g" | \
  sed "s|\${DB_NAME}|${DB_NAME}|g" > /app/config.json

echo "Config generated:"
cat /app/config.json

echo "Starting backend server..."
exec ./build/backend
