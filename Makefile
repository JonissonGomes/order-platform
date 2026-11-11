.PHONY: help setup setup-backend setup-frontend install-backend install-frontend \
	dev dev-backend dev-frontend build build-backend build-frontend clean \
	test test-backend test-frontend check-env check-make kill-port-backend \
	kill-port-frontend kill-ports create-super-admin check-backend-env check-frontend-env \
	start-backend start-frontend

# Windows define OS=Windows_NT mesmo no Git Bash; as recipes rodam em /bin/sh.
# Detectamos shell POSIX (MINGW/MSYS/CYGWIN) para evitar sintaxe cmd.exe.
UNAME_S := $(shell uname -s 2>/dev/null)

ifeq ($(OS),Windows_NT)
  ifneq (,$(findstring MINGW,$(UNAME_S)))
    IS_POSIX_SHELL := 1
    DETECTED_OS := Windows/Git Bash
  else ifneq (,$(findstring MSYS,$(UNAME_S)))
    IS_POSIX_SHELL := 1
    DETECTED_OS := Windows/MSYS
  else ifneq (,$(findstring CYGWIN,$(UNAME_S)))
    IS_POSIX_SHELL := 1
    DETECTED_OS := Windows/Cygwin
  else
    IS_POSIX_SHELL := 0
    DETECTED_OS := Windows/cmd
  endif
  IS_WINDOWS := 1
else
  IS_POSIX_SHELL := 1
  IS_WINDOWS := 0
  DETECTED_OS := $(if $(UNAME_S),$(UNAME_S),Unix)
endif

BACKEND_DIR = backend
FRONTEND_DIR = FE
GO_VERSION = 1.21
NODE_VERSION = 18

GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
BLUE = \033[0;34m
NC = \033[0m

# Preferir pnpm; fallback npm (usar como: $(call RUN_JS,<args>))
define RUN_JS
	if command -v pnpm >/dev/null 2>&1; then pnpm $(1); else npm $(1); fi
endef

help: ## Mostra esta mensagem de ajuda
	@echo "$(GREEN)Order Platform - Comandos Disponíveis:$(NC)"
	@echo ""
	@echo "$(BLUE)Sistema detectado: $(DETECTED_OS)$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

check-make: ## Verifica se make está instalado
	@echo "$(YELLOW)Verificando instalação do make...$(NC)"
	@make --version > /dev/null 2>&1 || (echo "$(RED)✗ Make não está instalado!$(NC)" && exit 1)
	@echo "$(GREEN)✓ Make está instalado$(NC)"

setup: check-make check-env setup-backend setup-frontend ## Configura todo o ambiente (backend + frontend)
	@echo "$(GREEN)✓ Setup completo!$(NC)"

setup-backend: ## Configura o ambiente do backend Go
	@echo "$(YELLOW)Configurando backend Go...$(NC)"
	@if [ ! -f "$(BACKEND_DIR)/.env" ]; then \
		if [ -f "$(BACKEND_DIR)/.env.example" ]; then \
			cp "$(BACKEND_DIR)/.env.example" "$(BACKEND_DIR)/.env"; \
			echo "$(GREEN)✓ Arquivo .env criado a partir de .env.example$(NC)"; \
			echo "$(YELLOW)⚠️  Edite $(BACKEND_DIR)/.env com suas credenciais$(NC)"; \
		else \
			echo "$(RED)✗ .env.example não encontrado em $(BACKEND_DIR)/$(NC)"; \
		fi; \
	else \
		echo "$(GREEN)✓ Arquivo .env já existe$(NC)"; \
	fi
	@cd $(BACKEND_DIR) && go mod download || echo "$(RED)✗ Erro ao baixar dependências Go$(NC)"
	@echo "$(GREEN)✓ Backend configurado$(NC)"

setup-frontend: ## Configura o ambiente do frontend React
	@echo "$(YELLOW)Configurando frontend React...$(NC)"
	@if [ ! -f "$(FRONTEND_DIR)/.env" ]; then \
		if [ -f "$(FRONTEND_DIR)/.env.example" ]; then \
			cp "$(FRONTEND_DIR)/.env.example" "$(FRONTEND_DIR)/.env"; \
			echo "$(GREEN)✓ Arquivo .env criado a partir de .env.example$(NC)"; \
			echo "$(YELLOW)⚠️  Edite $(FRONTEND_DIR)/.env se necessário$(NC)"; \
		else \
			echo "$(YELLOW)⚠️  .env.example não encontrado em $(FRONTEND_DIR)/$(NC)"; \
		fi; \
	else \
		echo "$(GREEN)✓ Arquivo .env já existe$(NC)"; \
	fi
	@cd $(FRONTEND_DIR) && ($(call RUN_JS,install) || $(call RUN_JS,install --legacy-peer-deps)) \
		|| echo "$(RED)✗ Erro ao instalar dependências$(NC)"
	@echo "$(GREEN)✓ Frontend configurado$(NC)"

install-backend: ## Instala dependências do backend
	@echo "$(YELLOW)Instalando dependências do backend...$(NC)"
	@cd $(BACKEND_DIR) && go mod download
	@echo "$(GREEN)✓ Dependências do backend instaladas$(NC)"

install-frontend: ## Instala dependências do frontend
	@echo "$(YELLOW)Instalando dependências do frontend...$(NC)"
	@cd $(FRONTEND_DIR) && ($(call RUN_JS,install) || $(call RUN_JS,install --legacy-peer-deps))
	@echo "$(GREEN)✓ Dependências do frontend instaladas$(NC)"

dev: kill-ports ## Inicia backend e frontend em modo desenvolvimento
ifeq ($(IS_WINDOWS),1)
	@echo "$(YELLOW)Iniciando backend e frontend em janelas separadas...$(NC)"
	@start cmd /k "cd $(BACKEND_DIR) && go run cmd/server/main.go"
	@sleep 2 2>/dev/null || timeout /t 2 /nobreak >nul 2>&1 || true
	@start cmd /k "cd $(FRONTEND_DIR) && (pnpm dev || npm run dev)"
	@echo "$(GREEN)✓ Backend e Frontend iniciados em janelas separadas$(NC)"
	@echo "$(BLUE)Backend: http://localhost:8080$(NC)"
	@echo "$(BLUE)Frontend: http://localhost:3000$(NC)"
else
	@echo "$(YELLOW)Iniciando backend e frontend...$(NC)"
	@echo "$(YELLOW)Use Ctrl+C para parar (ou 'make dev-backend' / 'make dev-frontend' em terminais separados)$(NC)"
	@cd $(BACKEND_DIR) && go run cmd/server/main.go &
	@sleep 2
	@cd $(FRONTEND_DIR) && $(call RUN_JS,run dev)
endif

# Aspas simples evitam o Git Bash expandir $vars antes do PowerShell.
kill-port-backend: ## Mata processos usando a porta 8080 (backend)
	@echo "$(YELLOW)Verificando porta 8080...$(NC)"
ifeq ($(IS_WINDOWS),1)
	@-powershell -NoProfile -Command '$$p = @(Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); if ($$p.Count -gt 0) { $$p | ForEach-Object { Stop-Process -Id $$_ -Force -ErrorAction SilentlyContinue }; Write-Host "Porta 8080 liberada" } else { Write-Host "Porta 8080 livre" }'
else
	@PID=$$(lsof -ti:8080 2>/dev/null || true); \
	if [ -n "$$PID" ]; then kill -9 $$PID 2>/dev/null && echo "$(GREEN)✓ Porta 8080 liberada$(NC)"; \
	else echo "$(GREEN)✓ Porta 8080 está livre$(NC)"; fi
endif

kill-port-frontend: ## Mata processos usando a porta 3000 (frontend)
	@echo "$(YELLOW)Verificando porta 3000...$(NC)"
ifeq ($(IS_WINDOWS),1)
	@-powershell -NoProfile -Command '$$p = @(Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique); if ($$p.Count -gt 0) { $$p | ForEach-Object { Stop-Process -Id $$_ -Force -ErrorAction SilentlyContinue }; Write-Host "Porta 3000 liberada" } else { Write-Host "Porta 3000 livre" }'
else
	@PID=$$(lsof -ti:3000 2>/dev/null || true); \
	if [ -n "$$PID" ]; then kill -9 $$PID 2>/dev/null && echo "$(GREEN)✓ Porta 3000 liberada$(NC)"; \
	else echo "$(GREEN)✓ Porta 3000 está livre$(NC)"; fi
endif

kill-ports: kill-port-backend kill-port-frontend ## Mata processos nas portas 8080 e 3000

dev-backend: kill-port-backend ## Inicia apenas o backend em modo desenvolvimento
	@echo "$(YELLOW)Iniciando backend Go...$(NC)"
	@cd $(BACKEND_DIR) && go run cmd/server/main.go

dev-frontend: kill-port-frontend ## Inicia apenas o frontend em modo desenvolvimento
	@echo "$(YELLOW)Iniciando frontend React...$(NC)"
	@cd $(FRONTEND_DIR) && $(call RUN_JS,run dev)

build: build-backend build-frontend ## Build de backend e frontend para produção

build-backend: ## Build do backend Go
	@echo "$(YELLOW)Build do backend...$(NC)"
	@cd $(BACKEND_DIR) && go build -o bin/server ./cmd/server
	@echo "$(GREEN)✓ Backend compilado em $(BACKEND_DIR)/bin/server$(NC)"

build-frontend: ## Build do frontend React
	@echo "$(YELLOW)Build do frontend...$(NC)"
	@cd $(FRONTEND_DIR) && $(call RUN_JS,exec vite build)
	@echo "$(GREEN)✓ Frontend compilado$(NC)"

start-backend: ## Inicia o backend em modo produção
	@echo "$(YELLOW)Iniciando backend em produção...$(NC)"
	@cd $(BACKEND_DIR) && \
		if [ -f bin/server ]; then ./bin/server; \
		elif [ -f bin/server.exe ]; then ./bin/server.exe; \
		else go run ./cmd/server; fi

start-frontend: ## Inicia o frontend em modo produção
	@echo "$(YELLOW)Iniciando frontend em produção...$(NC)"
	@cd $(FRONTEND_DIR) && $(call RUN_JS,start)

test: test-backend test-frontend ## Executa testes de backend e frontend

test-backend: ## Executa testes do backend
	@echo "$(YELLOW)Executando testes do backend...$(NC)"
	@cd $(BACKEND_DIR) && go test ./... -v

test-frontend: ## Executa testes do frontend
	@echo "$(YELLOW)Executando testes do frontend...$(NC)"
	@cd $(FRONTEND_DIR) && $(call RUN_JS,test)

clean: ## Limpa arquivos de build e cache
	@echo "$(YELLOW)Limpando arquivos...$(NC)"
	@rm -rf $(BACKEND_DIR)/bin $(BACKEND_DIR)/dist $(FRONTEND_DIR)/dist $(FRONTEND_DIR)/node_modules/.vite
	@echo "$(GREEN)✓ Limpeza concluída$(NC)"

check-env: ## Verifica se as ferramentas necessárias estão instaladas
	@echo "$(YELLOW)Verificando ambiente...$(NC)"
	@go version > /dev/null 2>&1 || (echo "$(RED)✗ Go não está instalado. Instale Go $(GO_VERSION)+$(NC)" && exit 1)
	@node --version > /dev/null 2>&1 || (echo "$(RED)✗ Node.js não está instalado. Instale Node.js $(NODE_VERSION)+$(NC)" && exit 1)
	@pnpm --version > /dev/null 2>&1 || echo "$(YELLOW)⚠️  pnpm não está instalado. Usando npm como fallback$(NC)"
	@echo "$(GREEN)✓ Ambiente verificado$(NC)"

check-backend-env: ## Verifica se o backend está configurado corretamente
	@echo "$(YELLOW)Verificando configuração do backend...$(NC)"
	@if [ ! -f "$(BACKEND_DIR)/.env" ]; then \
		echo "$(RED)✗ Arquivo .env não encontrado em $(BACKEND_DIR)/$(NC)"; \
		echo "$(YELLOW)Execute: make setup-backend$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ Backend configurado$(NC)"

check-frontend-env: ## Verifica se o frontend está configurado corretamente
	@echo "$(YELLOW)Verificando configuração do frontend...$(NC)"
	@if [ ! -d "$(FRONTEND_DIR)/node_modules" ]; then \
		echo "$(RED)✗ Dependências do frontend não instaladas$(NC)"; \
		echo "$(YELLOW)Execute: make setup-frontend$(NC)"; \
		exit 1; \
	fi
	@echo "$(GREEN)✓ Frontend configurado$(NC)"

create-super-admin: check-backend-env ## Cria um super admin interativamente
	@echo "$(YELLOW)Criando super admin...$(NC)"
	@cd $(BACKEND_DIR) && go run ./cmd/create-super-admin
