#!/bin/bash

echo "🔧 Installing dependencies and building..."
cd "$(dirname "$0")/.."

echo "📦 Building next-app..."
cd apps/next-app
npm install
npm run build

echo "📦 Building admin..."
cd ../admin
npm install
npm run build

echo "🛠️  Building Go backend..."
cd ../backend
go build -o backend

echo "🚀 Restarting apps with PM2..."
cd ../../
pm2 reload ecosystem.config.js --env production
pm2 save

echo "✅ Deployment complete!"
