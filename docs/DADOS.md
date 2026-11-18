# Base sintética — Acompanhamento multiprofissional pós-bariátrica

> **Todos os dados são sintéticos.** Nenhum paciente real. Parâmetros calibrados com o
> BELLA Pilot Trial (Yang et al., *Obes Surg* 2023;33:1702–1709).

## Conteúdo

| Arquivo | O que é | Linhas |
|---|---|---|
| `dados/pacientes.csv` | Cadastro clínico **pseudonimizado** (sem nome, sem contato) | 400 |
| `dados/identificadores_RESTRITO.csv` | Nome fictício, prontuário, nascimento, contato — **tabela separada** (demonstra pseudonimização) | 400 |
| `dados/pesagens.csv` | Peso, IMC, %TWL, %EWL e PA do pré-op até 12 meses | ~4.700 |
| `dados/questionarios_paciente.csv` | O que o paciente informa a cada 6 semanas (modelo BELLA) | ~2.200 |
| `dados/exames.csv` | Laboratório no pré-op, 6 e 12 meses (painel do BELLA) | ~900 |
| `dados/alertas.csv` | Alertas gerados por regra, com módulo e profissional responsável | ~1.150 |
| `dados/base_sintetica.json` | Tudo acima num JSON só (**sem** identificadores) — para o front usar sem backend | — |
| `dados/modelo_previsao.json` | Coeficientes do modelo + curvas de referência p10–p90 | — |
| `gerar_dados.py` | Gerador (`python3 gerar_dados.py 400 42`) — mude N/semente à vontade | — |
| `treinar_modelo.py` | Treina o modelo numa coorte histórica de 2.500 pacientes e valida na base do app | — |

"Hoje" na base = **18/11/2026**. Cirurgias de mar/2025 a out/2026 → 171 pacientes concluíram 12 meses, 229 em acompanhamento.

## Calibração vs. BELLA

| Indicador | Base sintética | BELLA |
|---|---|---|
| %TWL em 12 meses | 31,9% (RYGB 33,6 / Sleeve 29,5) | 31,2–32,7% |
| Mulheres | 76% | 70–81% |
| RYGB / Sleeve | 60 / 40 | ~62 / ~38 |
| Idade média | 42 | 42,5–43,8 |
| Deficiência de vitamina D (12m) | 29% | ~30% |
| Uso diário de suplementos | 72% | 69–88% |

Obs.: `pct_ewl` usa peso ideal = IMC 25 (equivale ao %EBMIL do artigo).

## Dicionário rápido

**pacientes**: `paciente_id` (pseudônimo P0001…), `sexo`, `idade`, `faixa_etaria`, `uf`, `altura_m`, `peso_pre_kg`, `imc_pre`, `tipo_cirurgia` (RYGB/Sleeve), `data_cirurgia`, `dia_pos_atual`, `status`, comorbidades (`dm2`, `has`, `dislipidemia`, `apneia_sono`), histórico psi (`transtorno_humor_previo`, `compulsao_alimentar_previa`), `tabagismo`, `vulnerabilidade_social`, `distancia_centro_km`.

**pesagens**: `dia_pos` (-90, 0, 7, 30, 42, 84, 90, 126, 168, 180, 210, 252, 270, 365), `peso_kg`, `imc`, `pct_twl`, `pct_ewl`, `pas_mmHg`, `pad_mmHg`, `fonte` (consulta/paciente).

**questionarios_paciente**: `dor_eva_0a10`, `vomitos_semana`, `sintomas_dumping`, `hidratacao_ml_dia`, `proteina_meta_atingida`, `uso_diario_suplementos`, `phq2_0a6`, `episodio_compulsao`, `alcool_doses_semana`, `exercicio_min_semana`, `qualidade_vida_0a100`.

**exames**: hemoglobina, ferritina, vit. D, B12, folato, tiamina (B1), zinco, cálcio, PTH, albumina, glicemia, HbA1c, LDL, HDL, triglicérides, `status_laudo`, `liberado_por`.

**alertas**: `modulo`, `responsavel`, `severidade` (baixa/media/alta), `regra`, `valor`, `status` (pendente/em_analise/resolvido).

## Regras de alerta → módulo

| Regra | Módulo | Responsável |
|---|---|---|
| Dor EVA > 5 (critério do BELLA) · Vômitos ≥ 3/sem | Recuperação cirúrgica | Enfermagem (triagem → cirurgião) |
| Vit. D < 20 · Hidratação < 1 L · Sem suplemento 2× seguidas | Nutricional | Nutricionista |
| B12 < 200 · Hb < 11,5 · Albumina < 3,5 · Tiamina baixa · Ferritina < 15 | Nutricional | Nutrólogo |
| HbA1c ≥ 7% · Hipoglicemia | Metabólico | Endocrinologista |
| PHQ-2 ≥ 3 · Álcool ≥ 7 doses/sem · Compulsão | Emocional e comportamental | Psicólogo/Psiquiatra |
| Insegurança alimentar / barreira de acesso | Apoio social | Assistente social |
| %TWL abaixo do p10 da curva (no front, via modelo) | Nutricional + Metabólico | Nutrição + Endocrino |

## Previsão de perda de peso

Regressão linear (dá para explicar na banca e roda em JS):

| Modelo | Entradas | Erro médio (validação) | R² |
|---|---|---|---|
| `pre_op` | idade, sexo, IMC, cirurgia, comorbidades, histórico psi | ~5–6 p.p. | 0,14 |
| `precoce` | + %TWL aos 30 e 90 dias | **~2 p.p.** | **0,85** |

Mensagem para a apresentação: *o pré-operatório prevê pouco; a perda nos primeiros 90 dias prevê muito → por isso o acompanhamento contínuo importa.*

Uso no front:
```js
const m = modelo.modelos.precoce;
const twl12 = m.intercepto + Object.entries(m.coeficientes)
  .reduce((s, [k, c]) => s + c * Number(paciente[k]), 0);           // rygb/masculino = 0/1
const tau = modelo.tau_dias;
const traj = t => twl12 * (1 - Math.exp(-t / tau)) / (1 - Math.exp(-365 / tau));
const ic80 = 1.28 * m.desvio_residual;                                // faixa ±
```
Plote a trajetória do paciente sobre as bandas `curvas_referencia[RYGB|Sleeve]` (p10–p90).

⚠️ Treinado em dados sintéticos gerados por uma curva exponencial — o R² alto é em parte "por construção". Diga isso na apresentação: o pipeline está pronto; com dados reais o número muda.

## LGPD e segurança — o que mostrar

1. **Dados de saúde são dados pessoais sensíveis** (art. 5º, II) e só podem ser tratados nas hipóteses do art. 11 (ex.: consentimento específico e destacado, tutela da saúde).
2. **Protótipo usa dados sintéticos** → nenhum dado pessoal é tratado. É a primeira e melhor medida.
3. **Pseudonimização** (arts. 12–13): identificadores ficam em tabela separada (`identificadores_RESTRITO`), ligada só pelo `paciente_id`. Em produção: banco/esquema separado, criptografado, acesso só do coordenador.
4. **Anonimização nos dashboards agregados**: faixa etária em vez de idade, UF em vez de cidade, sem datas exatas, e **supressão de grupos com menos de 5 pacientes** (k-anonimato).
5. **Controle de acesso por papel (RBAC)**: cada profissional edita só o próprio módulo; leitura mínima necessária; dados de psiquiatria com visibilidade restrita.
6. **Log de auditoria**: quem acessou/alterou qual paciente e quando.
7. **Criptografia**: HTTPS em trânsito; senhas com bcrypt/argon2; dados em repouso criptografados.
8. **Direitos do titular**: termo de consentimento, tela "meus dados" (acesso, correção, revogação).
9. **RIPD** (relatório de impacto, art. 38) citado como etapa obrigatória antes de ir para produção.

## PostgreSQL

**Com Docker (mais fácil):** na pasta `bariatrica`, rode `docker compose up -d`. Na primeira subida ele cria tudo e carrega os CSVs.
Conexão: `postgresql://postgres:postgres@localhost:5432/bariatrica`

**Postgres já instalado / na nuvem (Supabase, Neon, RDS…):**
```bash
createdb bariatrica
psql -d bariatrica -f postgres/01_schema.sql
psql -d bariatrica -f postgres/02_carga.sql            # rode de dentro da pasta bariatrica
psql -d bariatrica -f postgres/03_views_e_seguranca.sql
```

O que vem pronto:
- **Schemas separados**: `clinico` (saúde, pseudonimizado) e `restrito` (identificadores).
- **Views para os dashboards**: `vw_lista_pacientes`, `vw_fila_alertas`, `vw_curva_media` (p10/p50/p90), `vw_deficiencias`, `vw_dashboard_coorte` — as agregadas têm `HAVING count(*) >= 5` (k-anonimato).
- **Papéis**: `app_clinico` (lê/escreve saúde, não vê identificadores), `app_dashboard` (só views agregadas), `app_coordenador` (único com acesso a `restrito`). Troque as senhas de exemplo.
- **Auditoria por trigger**: toda alteração em alertas, exames e questionários vai para `clinico.audit_log`. A API identifica o usuário assim:
  ```sql
  BEGIN; SET LOCAL app.usuario = 'joana'; SET LOCAL app.papel = 'nutricionista';
  UPDATE clinico.alertas SET status = 'resolvido' WHERE alerta_id = 'A00001'; COMMIT;
  ```

Testado em PostgreSQL 16.

## Stack sugerida (web)

- **Front**: React + Vite + TypeScript + Tailwind + Recharts
- **Back**: FastAPI (Python — reaproveita o modelo e o gerador) + PostgreSQL
- **Auth**: JWT com papel no token

Plano B, se o prazo apertar: front lendo `base_sintetica.json` direto, sem backend (RBAC e log simulados no front).

## Divisão de trabalho

**Contrato primeiro (dia 1, os dois juntos):** definir os endpoints/JSON. O Dev A começa já com `base_sintetica.json` como mock e troca pela API depois.

| Dev A — Front e dashboards | Dev B — Dados, API, ML e LGPD |
|---|---|
| Layout, login e seletor de perfil | Subir o Postgres (schema e carga já prontos em `postgres/`) |
| Lista de pacientes com filtros e alertas | API REST: pacientes, pesagens, exames, questionários, alertas |
| Prontuário: abas Pré/Pós, linha do tempo, cards por módulo | JWT + RBAC (quem lê/edita cada módulo) |
| Formulário de cada módulo (só editável pelo dono) | Pseudonimização: tabela de identificadores separada |
| Gráfico do paciente vs. curvas p10–p90 + previsão | Endpoint `/previsao/{id}` e motor de alertas |
| Dashboard da coorte: KPIs, alertas por módulo, %TWL, deficiências | Endpoint `/dashboard` agregado com k-anonimato (n ≥ 5) |
| Questionário web do paciente (responsivo) | Log de auditoria + tela/relatório de acessos |
| Fila de alertas do profissional (pendente → resolvido) | Slide/documento de LGPD (este README, seção acima) |

**Roteiro da demo (~3 min):** coordenador vê o dashboard → abre a Maria (90 dias) → curva abaixo do p10 dispara alerta → entra como enfermagem e trata a dor > 5 → entra como nutricionista e vê a vit. D baixa liberada pelo lab → tenta editar o módulo de psicologia e é bloqueado → mostra o log de auditoria.
