# Protótipo bariátrica

Protótipo web de acompanhamento pós-bariátrica. Spec: [docs/SPEC.md](../docs/SPEC.md). Dados: [docs/DADOS.md](../docs/DADOS.md).

## Estrutura
- `web/` — front (Dev A). Permissões por papel em `web/src/permissoes.ts`.
- `api/` — backend FastAPI (Dev B).
- `postgres/` — schema, carga, views e segurança (rodam via `docker-compose.yml` na 1ª subida).
- `dados/` — CSVs/JSON sintéticos. `gerar_dados.py` e `treinar_modelo.py` ficam na raiz (usam `./dados` relativo ao script).

## Comandos
- Banco: `docker compose up -d` (porta do host: `DB_PORT=5435 docker compose up -d` se a 5432 estiver ocupada).
- Conexão: `postgresql://postgres:postgres@localhost:${DB_PORT:-5432}/bariatrica`
- Recarregar do zero: `docker compose down -v && docker compose up -d`
- Regenerar dados: `python3 gerar_dados.py 400 42`

## Regras
- Todos os dados são sintéticos; nunca commitar dados reais, `.env` ou `dados_historico_treino/`.
- Identificadores (`restrito`) nunca vão para o front nem para `base_sintetica.json`.
- Agregados com n < 5 são suprimidos.
- Nomes de módulo/papel em `permissoes.ts` batem com `alertas.csv` — não renomear sem atualizar ambos.
- Contrato da API é definido junto por Dev A e Dev B antes de implementar.
