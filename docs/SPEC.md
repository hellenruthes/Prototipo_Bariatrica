# SPEC — Protótipo de acompanhamento pós-bariátrica

Protótipo web multiprofissional. **Dados 100% sintéticos** (ver [DADOS.md](DADOS.md)).
"Hoje" na base = 18/11/2026.

## Objetivo
Acompanhar pacientes até 12 meses pós-cirurgia (RYGB/Sleeve), com alertas por regra, módulos por profissional, previsão de perda de peso e demonstração de LGPD (pseudonimização, RBAC, auditoria, k-anonimato).

## Escopo
- Lista de pacientes com filtros e alertas
- Prontuário: abas pré/pós, linha do tempo, cards por módulo
- Formulário por módulo, editável **só pelo dono** (ver `web/src/permissoes.ts`)
- Gráfico do paciente vs. curvas p10–p90 + previsão (`modelo_previsao.json`)
- Dashboard da coorte (KPIs, alertas por módulo, %TWL, deficiências), agregados com n ≥ 5
- Questionário web do paciente (responsivo)
- Fila de alertas do profissional (pendente → em_analise → resolvido)
- Log de auditoria

Fora do escopo: login real (perfil escolhido na tela inicial no front; JWT com papel é a evolução da API), uso clínico, dados reais.

## Arquitetura
| Camada | Tecnologia | Dono |
|---|---|---|
| `web/` | React + Vite + TypeScript + Tailwind + Recharts | Dev A |
| `api/` | FastAPI + PostgreSQL, JWT com papel | Dev B |
| `postgres/` | schemas `clinico` / `restrito`, views, papéis, auditoria por trigger | Dev B |

Plano B: front lendo `dados/base_sintetica.json` sem backend (RBAC e log simulados).

## Contrato (a fechar no dia 1, Dev A + Dev B)
Endpoints previstos (JSON espelhando as views/tabelas do Postgres):
- `GET /pacientes`, `GET /pacientes/{id}`
- `GET /pacientes/{id}/pesagens | exames | questionarios`
- `GET /alertas`, `PATCH /alertas/{id}` (status)
- `GET /previsao/{id}`
- `GET /dashboard` (agregado, k ≥ 5)
- `GET /auditoria`

Em aberto: formato de erro, paginação, nomes de campos finais.

## Regras que não podem quebrar
1. Identificadores só em `restrito`, acessíveis apenas ao coordenador; nunca no JSON do front.
2. Dashboards agregados suprimem grupos com < 5 pacientes.
3. Escrita sempre registra `app.usuario` e `app.papel` (`SET LOCAL`) para a auditoria.
4. Cada profissional edita só o próprio módulo; psiquiatria com visibilidade restrita.
5. Previsão: avisar que o modelo é treinado em dados sintéticos.

## Roteiro da demo (~3 min)
Coordenador vê dashboard → abre a Maria (90 dias) → curva abaixo do p10 dispara alerta → enfermagem trata dor > 5 → nutricionista vê vit. D baixa → tenta editar psicologia e é bloqueado → log de auditoria.

## Critérios de aceite
- `docker compose up -d` sobe o banco com 400 pacientes em `clinico.pacientes`.
- Cada papel enxerga/edita apenas o permitido em `permissoes.ts`.
- Roteiro da demo roda de ponta a ponta.
