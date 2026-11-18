# Uso: make <alvo>   (ex.: make up, DB_PORT=5435 make up)
DB_PORT ?= 5432
export DB_PORT

PSQL = docker compose exec -T db psql -U postgres -d bariatrica

.DEFAULT_GOAL := help
.PHONY: help up down reset logs psql check dados treinar

help: ## Lista os alvos
	@grep -E '^[a-z]+:.*## ' $(MAKEFILE_LIST) | awk -F':.*## ' '{printf "  make %-9s %s\n", $$1, $$2}'

up: ## Sobe o Postgres e carrega a base (1ª vez)
	docker compose up -d

down: ## Para o banco (mantém os dados)
	docker compose down

reset: ## Apaga o volume e recarrega tudo do zero
	docker compose down -v
	docker compose up -d

logs: ## Acompanha os logs do banco
	docker compose logs -f db

psql: ## Abre o psql interativo
	docker compose exec db psql -U postgres -d bariatrica

check: ## Confere as contagens (pacientes deve ter 400)
	@$(PSQL) -tAc "select 'pacientes', count(*) from clinico.pacientes union all select 'identificadores', count(*) from restrito.identificadores union all select 'pesagens', count(*) from clinico.pesagens union all select 'alertas', count(*) from clinico.alertas"

dados: ## Regenera a base sintética (400 pacientes, semente 42)
	python3 gerar_dados.py 400 42

treinar: ## Retreina o modelo de previsão
	python3 treinar_modelo.py
