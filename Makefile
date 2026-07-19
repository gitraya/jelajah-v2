# Jelajah — dev Makefile (Docker Compose)
#
# Brings up the full stack via docker-compose:
#   backend      Django REST API        http://localhost:8000
#   frontend     React SPA (v1, prod)   http://localhost:5173
#   frontend-v2  React SPA (v2, WIP)    http://localhost:5174
#   db           PostgreSQL             localhost:5432
#
# Quick start:
#   make up        # build (if needed) and start all services in the background
#   make logs      # follow logs from all services
#   make down      # stop and remove all containers

SHELL   := /bin/bash
COMPOSE := docker compose

.DEFAULT_GOAL := help

.PHONY: help
help: ## Show this help
	@grep -E '^[a-zA-Z0-9_-]+:.*?## ' $(MAKEFILE_LIST) \
		| awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2}'

# ---------------------------------------------------------------------------
# Lifecycle
# ---------------------------------------------------------------------------

.PHONY: build
build: ## Build (or rebuild) all images
	$(COMPOSE) build

.PHONY: up
up: ## Build if needed and start all services in the background
	$(COMPOSE) up --build -d

.PHONY: run
run: ## Build if needed and start all services in the foreground (Ctrl-C stops)
	$(COMPOSE) up --build

.PHONY: down
down: ## Stop and remove all containers
	$(COMPOSE) down

.PHONY: restart
restart: ## Restart all services
	$(COMPOSE) restart

.PHONY: ps
ps: ## Show running services
	$(COMPOSE) ps

.PHONY: logs
logs: ## Follow logs from all services
	$(COMPOSE) logs -f

# ---------------------------------------------------------------------------
# Per-service (usage: make up-one s=frontend-v2, make sh s=backend)
# ---------------------------------------------------------------------------

.PHONY: up-one
up-one: ## Start a single service: make up-one s=<service>
	$(COMPOSE) up --build -d $(s)

.PHONY: sh
sh: ## Open a shell in a service: make sh s=<service>
	$(COMPOSE) exec $(s) sh

# ---------------------------------------------------------------------------
# Backend helpers (run inside the backend container)
# ---------------------------------------------------------------------------

.PHONY: migrate
migrate: ## Apply Django migrations
	$(COMPOSE) exec backend python manage.py migrate

.PHONY: makemigrations
makemigrations: ## Create Django migrations
	$(COMPOSE) exec backend python manage.py makemigrations

.PHONY: superuser
superuser: ## Create a Django superuser
	$(COMPOSE) exec backend python manage.py createsuperuser

.PHONY: test
test: ## Run backend tests
	$(COMPOSE) exec backend python manage.py test

# ---------------------------------------------------------------------------
# Cleanup
# ---------------------------------------------------------------------------

.PHONY: clean
clean: ## Stop containers and remove volumes (drops the DB + node_modules)
	$(COMPOSE) down -v
