#!/bin/bash
set -e

echo "Setting up ButuhBantuan monorepo..."

# Install Node dependencies
pnpm install

# Copy env examples
for app in apps/web-app apps/dashboard apps/api; do
  if [ -f "$app/.env.example" ] && [ ! -f "$app/.env" ]; then
    cp "$app/.env.example" "$app/.env"
    echo "Created $app/.env"
  fi
done

# Tidy Go modules
cd apps/api && go mod tidy && cd ../..

echo "Setup complete. Run 'pnpm dev' to start all services."
