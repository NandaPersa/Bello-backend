#!/bin/bash
if [ -z "$1" ]; then
  echo "Gerando clientes do Prisma para TODOS os módulos..."
  for schema in src/*/infrastructure/database/schema.prisma; do
    npx prisma generate --schema="$schema"
  done
else
  echo "Gerando cliente do Prisma para o módulo: $1"
  npx prisma generate --schema="src/$1/infrastructure/database/schema.prisma"
fi
