#!/bin/bash

cd /home/ananda/Documentos/Bello/api

MODULES=("identity" "professional-catalog" "discovery" "scheduling" "client-records" "reviews" "billing" "payments" "marketing" "notifications" "analytics" "admin")

ENV_CONTENT="# Conexões físicas do Banco de Dados (Isolamento por Schema/Módulo)\n# A senha padrão aqui corresponde ao que foi gerado no init.sql do Docker.\n\n"
PRISMA_GENERATE_CMD="\"prisma:generate:all\": \""

for mod in "${MODULES[@]}"; do
  MOD_SNAKE=$(echo "$mod" | tr '-' '_')
  MOD_UPPER=$(echo "$MOD_SNAKE" | tr '[:lower:]' '[:upper:]')
  
  mkdir -p "src/$mod/infrastructure/database"
  
  cat <<PRISMA > "src/$mod/infrastructure/database/schema.prisma"
generator client {
  provider = "prisma-client-js"
  output   = "../../../../../node_modules/@prisma/client-${mod}"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL_${MOD_UPPER}")
}
PRISMA

  ENV_CONTENT+="DATABASE_URL_${MOD_UPPER}=\"postgresql://${MOD_SNAKE}_user:${MOD_SNAKE}_pass@localhost:5432/bello_db?schema=${MOD_SNAKE}\"\n"
  
  # Concatenate the generate command
  if [ "$mod" == "admin" ]; then
      PRISMA_GENERATE_CMD+="prisma generate --schema=src/$mod/infrastructure/database/schema.prisma\""
  else
      PRISMA_GENERATE_CMD+="prisma generate --schema=src/$mod/infrastructure/database/schema.prisma \\&\\& "
  fi
done

echo -e "$ENV_CONTENT" > .env.example
echo -e "$ENV_CONTENT" > .env

# Cria um script shell simples para gerenciar as migrations de um módulo especifico, já que são 12.
mkdir -p scripts
cat <<MIGRATION_SCRIPT > scripts/migrate.sh
#!/bin/bash
if [ -z "\$1" ] || [ -z "\$2" ]; then
  echo "Uso: ./scripts/migrate.sh <nome-do-modulo> <nome-da-migration>"
  echo "Exemplo: ./scripts/migrate.sh identity initial_setup"
  exit 1
fi

npx prisma migrate dev --name "\$2" --schema="src/\$1/infrastructure/database/schema.prisma"
MIGRATION_SCRIPT
chmod +x scripts/migrate.sh

cat <<GENERATE_SCRIPT > scripts/generate.sh
#!/bin/bash
if [ -z "\$1" ]; then
  echo "Gerando client para TODOS os módulos..."
else
  echo "Gerando client para o módulo: $1"
  npx prisma generate --schema="src/$1/infrastructure/database/schema.prisma"
fi
