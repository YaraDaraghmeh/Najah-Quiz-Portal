#!/bin/sh
set -eu

if [ ! -f /app/data/dev.db ]; then
  echo "Initializing the database..."
  npx prisma db push --skip-generate
  npm run seed
else
  npx prisma db push --skip-generate
fi

exec npm start
