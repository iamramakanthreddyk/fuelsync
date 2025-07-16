#!/bin/bash
echo "Installing dependencies..."
npm install

echo "Generating Prisma client..."
npx prisma generate

echo "Building TypeScript..."
npm run build

echo "Build completed successfully!"