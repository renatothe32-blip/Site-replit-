#!/usr/bin/env bash
set -e

echo "1) Install root deps..."
npm ci

echo "2) Install workspace deps..."
npm --workspace @ra-studio/api ci
npm --workspace @ra-studio/web ci
npm --workspace @ra-studio/runner ci

echo "3) Start docker services..."
docker-compose up -d --build

echo "4) Run prisma migrate (API)..."
cd apps/api
npx prisma generate
npx prisma migrate dev --name init --preview-feature

echo "Done. Abra http://localhost:3000"
