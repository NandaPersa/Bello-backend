#!/bin/bash
if [ -z "$1" ] || [ -z "$2" ]; then
  echo "Uso: npm run db:migrate <modulo> <nome_da_migration>"
  echo "Exemplo: npm run db:migrate identity inicial"
  exit 1
fi
npx prisma migrate dev --name "$2" --schema="src/$1/infrastructure/database/schema.prisma"
