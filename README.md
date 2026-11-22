# Protótipo Bariátrica

Protótipo web de acompanhamento multiprofissional pós-cirurgia bariátrica: alertas por regra, módulos por profissional, previsão de perda de peso e demonstração de LGPD (pseudonimização, RBAC, auditoria, k-anonimato).

> **Todos os dados são sintéticos.** Nenhum paciente real. Calibrados com o BELLA Pilot Trial (Yang et al., *Obes Surg* 2023).

## Estrutura

| Pasta | Conteúdo | Dono |
|---|---|---|
| `web/` | Front (React + Vite + TS) e `src/permissoes.ts` | Dev A |
| `api/` | Backend (FastAPI) | Dev B |
| `postgres/` | Schema, carga, views, papéis e auditoria | Dev B |
| `dados/` | CSVs e JSON sintéticos | — |
| `docs/` | [SPEC](docs/SPEC.md) e [dicionário de dados / LGPD](docs/DADOS.md) | — |

## Como rodar a demo (só o front, sem banco nem API)

Requer Node 20+. A demo lê `dados/base_sintetica.json` direto, então não precisa de Docker.

```bash
cd web
npm install
npm run dev      # abre em http://localhost:5173
```

Na tela inicial escolha o perfil (profissional, coordenador ou paciente). As ações ficam no navegador; o botão **Reiniciar demo** limpa tudo. Roteiro de demonstração em [web/README.md](web/README.md).

Outros comandos: `npm run build` (confere tipos e gera o build) e `npm run preview` (serve o build).

**Erro `Cannot find native binding` (rolldown) ao rodar `npm run dev`?** É o bug do npm com dependências opcionais (o `node_modules` ficou sem o binário da sua plataforma). Dentro de `web/`:

```bash
rm -rf node_modules
npm ci
npm run dev
```

Se persistir, confira `npm config get omit` (se mostrar `optional`, use `npm install --include=optional`) e não copie o `node_modules` de outra máquina.

## Começando (banco de dados)

Requer Docker e `make`.

```bash
make up      # sobe o Postgres 16 e carrega a base
make check   # confere as contagens (pacientes = 400)
make psql    # abre o psql
```

Conexão: `postgresql://postgres:postgres@localhost:5432/bariatrica`

Se a porta 5432 estiver ocupada: `DB_PORT=5435 make up` (use o mesmo `DB_PORT` nos demais alvos).

## Alvos do Makefile

| Alvo | O que faz |
|---|---|
| `make up` | Sobe o banco |
| `make down` | Para o banco (mantém os dados) |
| `make reset` | Apaga o volume e recarrega do zero |
| `make logs` | Logs do banco |
| `make psql` | psql interativo |
| `make check` | Contagens das tabelas principais |
| `make dados` | Regenera a base sintética |
| `make treinar` | Retreina o modelo de previsão |

## Documentação

- [docs/SPEC.md](docs/SPEC.md) — escopo, arquitetura, contrato da API e roteiro da demo
- [docs/DADOS.md](docs/DADOS.md) — dicionário de dados, regras de alerta, modelo e LGPD
