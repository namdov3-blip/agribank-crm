#!/bin/sh
# Production start script for Railway
# Runs migrations and seeds before starting the server

set -e

echo "🚀 Starting Agribank CRM Backend..."

# Generate Prisma Client (if needed)
echo "📦 Generating Prisma Client..."
npx prisma generate

# Run migrations
echo "🔄 Running database migrations..."
npx prisma migrate deploy

# Seed database (only if needed, idempotent)
echo "🌱 Seeding database..."
npx prisma db seed || echo "⚠️  Seed completed with warnings (this is OK if data already exists)"

# Start the server
echo "✨ Starting server..."
node dist/index.js
