#!/bin/bash
set -e

DEPLOY_USER="${DEPLOY_USER:-deploy}"
DEPLOY_HOST="${DEPLOY_HOST:?DEPLOY_HOST not set}"
DEPLOY_PATH="/opt/butuhbantuan/api"

echo "Building API..."
cd apps/api && go build -o bin/api main.go && cd ../..

echo "Deploying to $DEPLOY_HOST..."
rsync -avz --delete apps/api/bin/api "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/bin/"
rsync -avz apps/api/.env "$DEPLOY_USER@$DEPLOY_HOST:$DEPLOY_PATH/.env"

ssh "$DEPLOY_USER@$DEPLOY_HOST" "sudo systemctl restart butuhbantuan-api"
echo "API deployed."
