#!/bin/bash
# Executado pelo container do Postgres na primeira inicialização
set -e
cd /carga
for f in postgres/01_schema.sql postgres/02_carga.sql postgres/03_views_e_seguranca.sql; do
  echo ">> $f"
  psql -v ON_ERROR_STOP=1 -U "$POSTGRES_USER" -d "$POSTGRES_DB" -f "$f"
done
