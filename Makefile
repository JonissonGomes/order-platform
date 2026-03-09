.PHONY: help setup setup-backend setup-frontend install-backend install-frontend dev dev-backend dev-frontend build build-backend build-frontend clean test test-backend test-frontend check-env check-make kill-port-backend kill-port-frontend kill-ports create-super-admin

# Detectar sistema operacional
ifeq ($(OS),Windows_NT)
    DETECTED_OS := Windows
    COPY_CMD := copy
    MKDIR_CMD := if not exist
    RM_CMD := del /q /s
    RMDIR_CMD := rmdir /s /q
    SEP := \\
    DEV_CMD := start cmd /k
    TIMEOUT_CMD := timeout /t 2 /nobreak >nul
else
    DETECTED_OS := $(shell uname -s)
    COPY_CMD := cp
    MKDIR_CMD := mkdir -p
    RM_CMD := rm -rf
    RMDIR_CMD := rm -rf
    SEP := /
    DEV_CMD := 
    TIMEOUT_CMD := sleep 2
endif

# Variáveis
BACKEND_DIR = backend
FRONTEND_DIR = FE
GO_VERSION = 1.21
NODE_VERSION = 18

# Cores para output (funciona no Git Bash e WSL)
GREEN = \033[0;32m
YELLOW = \033[1;33m
RED = \033[0;31m
BLUE = \033[0;34m
NC = \033[0m # No Color

help: ## Mostra esta mensagem de ajuda
	@echo "$(GREEN)Order Platform - Comandos Disponíveis:$(NC)"
	@echo ""
	@echo "$(BLUE)Sistema detectado: $(DETECTED_OS)$(NC)"
	@echo ""
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  $(YELLOW)%-20s$(NC) %s\n", $$1, $$2}'
	@echo ""

check-make: ## Verifica se make está instalado
	@echo "$(YELLOW)Verificando instalação do make...$(NC)"
	@make --version > /dev/null 2>&1 || (echo "$(RED)✗ Make não está instalado!$(NC)" && echo "$(YELLOW)No Windows, instale via:$(NC)" && echo "  - Chocolatey: choco install make" && echo "  - Ou use Git Bash (já vem com make)" && echo "  - Ou use WSL" && exit 1)
	@echo "$(GREEN)✓ Make está instalado$(NC)"

setup: check-make check-env setup-backend setup-frontend ## Configura todo o ambiente (backend + frontend)
	@echo "$(GREEN)✓ Setup completo!$(NC)"

setup-backend: ## Configura o ambiente do backend Go
	@echo "$(YELLOW)Configurando backend Go...$(NC)"
ifeq ($(OS),Windows_NT)
	@if not exist "$(BACKEND_DIR)\.env" ( \
		if exist "$(BACKEND_DIR)\.env.example" ( \
			copy "$(BACKEND_DIR)\.env.example" "$(BACKEND_DIR)\.env" >nul && \
			echo $(GREEN)✓ Arquivo .env criado a partir de .env.example$(NC) && \
			echo $(YELLOW)⚠️  Por favor, edite $(BACKEND_DIR)\.env com suas credenciais$(NC) \
		) else ( \
			echo $(RED)✗ Arquivo .env.example não encontrado em $(BACKEND_DIR)\$(NC) && \
			echo $(YELLOW)⚠️  Crie um arquivo $(BACKEND_DIR)\.env.example primeiro$(NC) \
		) \
	) else ( \
		echo $(GREEN)✓ Arquivo .env já existe$(NC) \
	)
else
	@if [ ! -f "$(BACKEND_DIR)/.env" ]; then \
		if [ -f "$(BACKEND_DIR)/.env.example" ]; then \
			cp $(BACKEND_DIR)/.env.example $(BACKEND_DIR)/.env; \
			echo "$(GREEN)✓ Arquivo .env criado a partir de .env.example$(NC)"; \
			echo "$(YELLOW)⚠️  Por favor, edite $(BACKEND_DIR)/.env com suas credenciais$(NC)"; \
		else \
			echo "$(RED)✗ Arquivo .env.example não encontrado em $(BACKEND_DIR)/$(NC)"; \
			echo "$(YELLOW)⚠️  Crie um arquivo $(BACKEND_DIR)/.env.example primeiro$(NC)"; \
		fi \
	else \
		echo "$(GREEN)✓ Arquivo .env já existe$(NC)"; \
	fi
endif
	@cd $(BACKEND_DIR) && go mod download || echo "$(RED)✗ Erro ao baixar dependências Go$(NC)"
	@echo "$(GREEN)✓ Backend configurado$(NC)"

setup-frontend: ## Configura o ambiente do frontend React
	@echo "$(YELLOW)Configurando frontend React...$(NC)"
ifeq ($(OS),Windows_NT)
	@if not exist "$(FRONTEND_DIR)\.env" ( \
		if exist "$(FRONTEND_DIR)\.env.example" ( \
			copy "$(FRONTEND_DIR)\.env.example" "$(FRONTEND_DIR)\.env" >nul && \
			echo $(GREEN)✓ Arquivo .env criado a partir de .env.example$(NC) && \
			echo $(YELLOW)⚠️  Por favor, edite $(FRONTEND_DIR)\.env com suas credenciais$(NC) \
		) else ( \
			echo $(YELLOW)⚠️  Arquivo .env.example não encontrado em $(FRONTEND_DIR)\$(NC) && \
			echo $(YELLOW)⚠️  Configure as variáveis de ambiente se necessário$(NC) \
		) \
	) else ( \
		echo $(GREEN)✓ Arquivo .env já existe$(NC) \
	)
else
	@if [ ! -f "$(FRONTEND_DIR)/.env" ]; then \
		if [ -f "$(FRONTEND_DIR)/.env.example" ]; then \
			cp $(FRONTEND_DIR)/.env.example $(FRONTEND_DIR)/.env; \
			echo "$(GREEN)✓ Arquivo .env criado a partir de .env.example$(NC)"; \
			echo "$(YELLOW)⚠️  Por favor, edite $(FRONTEND_DIR)/.env com suas credenciais$(NC)"; \
		else \
			echo "$(YELLOW)⚠️  Arquivo .env.example não encontrado em $(FRONTEND_DIR)/$(NC)"; \
			echo "$(YELLOW)⚠️  Configure as variáveis de ambiente se necessário$(NC)"; \
		fi \
	else \
		echo "$(GREEN)✓ Arquivo .env já existe$(NC)"; \
	fi
endif
	@cd $(FRONTEND_DIR) && (command -v pnpm >/dev/null 2>&1 && pnpm install || npm install --legacy-peer-deps) || echo "$(RED)✗ Erro ao instalar dependências$(NC)"
	@echo "$(GREEN)✓ Frontend configurado$(NC)"

install-backend: ## Instala dependências do backend
	@echo "$(YELLOW)Instalando dependências do backend...$(NC)"
	@cd $(BACKEND_DIR) && go mod download
	@echo "$(GREEN)✓ Dependências do backend instaladas$(NC)"

install-frontend: ## Instala dependências do frontend
	@echo "$(YELLOW)Instalando dependências do frontend...$(NC)"
ifeq ($(OS),Windows_NT)
	@cd $(FRONTEND_DIR) && (pnpm install || npm install --legacy-peer-deps)
else
	@cd $(FRONTEND_DIR) && (command -v pnpm >/dev/null 2>&1 && pnpm install || npm install --legacy-peer-deps)
endif
	@echo "$(GREEN)✓ Dependências do frontend instaladas$(NC)"

dev: kill-ports ## Inicia backend e frontend em modo desenvolvimento (em janelas separadas no Windows)
ifeq ($(OS),Windows_NT)
	@echo "$(YELLOW)Iniciando backend e frontend em janelas separadas...$(NC)"
	@$(DEV_CMD) "cd $(BACKEND_DIR) && go run cmd/server/main.go"
	@$(TIMEOUT_CMD)
	@$(DEV_CMD) "cd $(FRONTEND_DIR) && (pnpm dev 2>nul || npx vite)"
	@echo "$(GREEN)✓ Backend e Frontend iniciados em janelas separadas$(NC)"
	@echo "$(BLUE)Backend: http://localhost:8080$(NC)"
	@echo "$(BLUE)Frontend: http://localhost:3000$(NC)"
else
	@echo "$(YELLOW)Iniciando backend e frontend...$(NC)"
	@echo "$(YELLOW)Use Ctrl+C para parar$(NC)"
	@echo "$(YELLOW)Ou execute 'make dev-backend' e 'make dev-frontend' em terminais separados$(NC)"
	@cd $(BACKEND_DIR) && go run cmd/server/main.go &
	@sleep 2
	@cd $(FRONTEND_DIR) && (command -v pnpm >/dev/null 2>&1 && pnpm dev || npx vite)
endif

kill-port-backend: ## Mata processos usando a porta 8080 (backend)
	@echo "$(YELLOW)Verificando porta 8080...$(NC)"
ifeq ($(OS),Windows_NT)
	@powershell -Command "$$procId = (Get-NetTCPConnection -LocalPort 8080 -ErrorAction SilentlyContinue).OwningProcess; if ($$procId) { Write-Host '$(YELLOW)Matando processo' $$procId 'na porta 8080...$(NC)'; Stop-Process -Id $$procId -Force -ErrorAction SilentlyContinue; Write-Host '$(GREEN)✓ Processo na porta 8080 finalizado$(NC)' } else { Write-Host '$(GREEN)✓ Porta 8080 está livre$(NC)' }"
else
	@PID=$$(lsof -ti:8080 2>/dev/null || echo ""); \
	if [ -n "$$PID" ]; then \
		echo "$(YELLOW)Matando processo $$PID na porta 8080...$(NC)"; \
		kill -9 $$PID 2>/dev/null && \
		echo "$(GREEN)✓ Processo na porta 8080 finalizado$(NC)" || \
		echo "$(RED)✗ Erro ao finalizar processo$(NC)"; \
	else \
		echo "$(GREEN)✓ Porta 8080 está livre$(NC)"; \
	fi
endif

kill-port-frontend: ## Mata processos usando a porta 3000 (frontend)
	@echo "$(YELLOW)Verificando porta 3000...$(NC)"
ifeq ($(OS),Windows_NT)
	@powershell -Command "$$procId = (Get-NetTCPConnection -LocalPort 3000 -ErrorAction SilentlyContinue).OwningProcess; if ($$procId) { Write-Host '$(YELLOW)Matando processo' $$procId 'na porta 3000...$(NC)'; Stop-Process -Id $$procId -Force -ErrorAction SilentlyContinue; Write-Host '$(GREEN)✓ Processo na porta 3000 finalizado$(NC)' } else { Write-Host '$(GREEN)✓ Porta 3000 está livre$(NC)' }"
else
	@PID=$$(lsof -ti:3000 2>/dev/null || echo ""); \
	if [ -n "$$PID" ]; then \
		echo "$(YELLOW)Matando processo $$PID na porta 3000...$(NC)"; \
		kill -9 $$PID 2>/dev/null && \
		echo "$(GREEN)✓ Processo na porta 3000 finalizado$(NC)" || \
		echo "$(RED)✗ Erro ao finalizar processo$(NC)"; \
	else \
		echo "$(GREEN)✓ Porta 3000 está livre$(NC)"; \
	fi
endif

kill-ports: kill-port-backend kill-port-frontend ## Mata processos nas portas 8080 e 3000

dev-backend: kill-port-backend ## Inicia apenas o backend em modo desenvolvimento
	@echo "$(YELLOW)Iniciando backend Go...$(NC)"
	@cd $(BACKEND_DIR) && go run cmd/server/main.go

dev-frontend: kill-port-frontend ## Inicia apenas o frontend em modo desenvolvimento
	@echo "$(YELLOW)Iniciando frontend React (Vite)...$(NC)"
ifeq ($(OS),Windows_NT)
	@cd $(FRONTEND_DIR) && (pnpm dev 2>nul || npx vite)
else
	@cd $(FRONTEND_DIR) && (command -v pnpm >/dev/null 2>&1 && pnpm dev || npx vite)
endif

build: build-backend build-frontend ## Build de backend e frontend para produção

build-backend: ## Build do backend Go
	@echo "$(YELLOW)Build do backend...$(NC)"
	@cd $(BACKEND_DIR) && go build -o bin/server cmd/server/main.go
	@echo "$(GREEN)✓ Backend compilado em $(BACKEND_DIR)/bin/server$(NC)"

build-frontend: ## Build do frontend React
	@echo "$(YELLOW)Build do frontend...$(NC)"
ifeq ($(OS),Windows_NT)
	@cd $(FRONTEND_DIR) && (pnpm build || npm run build)
else
	@cd $(FRONTEND_DIR) && (command -v pnpm >/dev/null 2>&1 && pnpm build || npm run build)
endif
	@echo "$(GREEN)✓ Frontend compilado$(NC)"

start-backend: ## Inicia o backend em modo produção
	@echo "$(YELLOW)Iniciando backend em produção...$(NC)"
ifeq ($(OS),Windows_NT)
	@cd $(BACKEND_DIR) && (if exist bin\server.exe (bin\server.exe) else (go run cmd/server/main.go))
else
	@cd $(BACKEND_DIR) && (if [ -f bin/server ]; then ./bin/server; else go run cmd/server/main.go; fi)
endif

start-frontend: ## Inicia o frontend em modo produção
	@echo "$(YELLOW)Iniciando frontend em produção...$(NC)"
ifeq ($(OS),Windows_NT)
	@cd $(FRONTEND_DIR) && (pnpm start || npm start)
else
	@cd $(FRONTEND_DIR) && (command -v pnpm >/dev/null 2>&1 && pnpm start || npm start)
endif

test: test-backend test-frontend ## Executa testes de backend e frontend

test-backend: ## Executa testes do backend
	@echo "$(YELLOW)Executando testes do backend...$(NC)"
	@cd $(BACKEND_DIR) && go test ./... -v

test-frontend: ## Executa testes do frontend
	@echo "$(YELLOW)Executando testes do frontend...$(NC)"
ifeq ($(OS),Windows_NT)
	@cd $(FRONTEND_DIR) && (pnpm test || npm test)
else
	@cd $(FRONTEND_DIR) && (command -v pnpm >/dev/null 2>&1 && pnpm test || npm test)
endif

clean: ## Limpa arquivos de build e cache
	@echo "$(YELLOW)Limpando arquivos...$(NC)"
ifeq ($(OS),Windows_NT)
	@if exist "$(BACKEND_DIR)\bin" $(RMDIR_CMD) "$(BACKEND_DIR)\bin"
	@if exist "$(BACKEND_DIR)\dist" $(RMDIR_CMD) "$(BACKEND_DIR)\dist"
	@if exist "$(FRONTEND_DIR)\dist" $(RMDIR_CMD) "$(FRONTEND_DIR)\dist"
	@if exist "$(FRONTEND_DIR)\node_modules\.vite" $(RMDIR_CMD) "$(FRONTEND_DIR)\node_modules\.vite"
else
	@$(RM_CMD) $(BACKEND_DIR)/bin
	@$(RM_CMD) $(BACKEND_DIR)/dist
	@$(RM_CMD) $(FRONTEND_DIR)/dist
	@$(RM_CMD) $(FRONTEND_DIR)/node_modules/.vite
endif
	@echo "$(GREEN)✓ Limpeza concluída$(NC)"

check-env: ## Verifica se as ferramentas necessárias estão instaladas
	@echo "$(YELLOW)Verificando ambiente...$(NC)"
	@go version > /dev/null 2>&1 || (echo "$(RED)✗ Go não está instalado. Instale Go $(GO_VERSION)+$(NC)" && echo "$(YELLOW)📖 Guia de instalação: INSTALL_GO_WINDOWS.md$(NC)" && echo "$(YELLOW)   Ou acesse: https://go.dev/dl/$(NC)" && exit 1)
	@node --version > /dev/null 2>&1 || (echo "$(RED)✗ Node.js não está instalado. Instale Node.js $(NODE_VERSION)+$(NC)" && echo "$(YELLOW)📖 Windows: https://nodejs.org/$(NC)" && echo "$(YELLOW)📖 WSL/Linux: INSTALL_NODE_WSL.md$(NC)" && exit 1)
	@pnpm --version > /dev/null 2>&1 || echo "$(YELLOW)⚠️  pnpm não está instalado. Usando npm como fallback$(NC)"
	@echo "$(GREEN)✓ Ambiente verificado$(NC)"

check-backend-env: ## Verifica se o backend está configurado corretamente
	@echo "$(YELLOW)Verificando configuração do backend...$(NC)"
ifeq ($(OS),Windows_NT)
	@if not exist "$(BACKEND_DIR)\.env" ( \
		echo $(RED)✗ Arquivo .env não encontrado em $(BACKEND_DIR)\$(NC) && \
		echo $(YELLOW)Execute: make setup-backend$(NC) && \
		exit 1 \
	)
else
	@if [ ! -f "$(BACKEND_DIR)/.env" ]; then \
		echo "$(RED)✗ Arquivo .env não encontrado em $(BACKEND_DIR)/$(NC)"; \
		echo "$(YELLOW)Execute: make setup-backend$(NC)"; \
		exit 1; \
	fi
endif
	@echo "$(GREEN)✓ Backend configurado$(NC)"

check-frontend-env: ## Verifica se o frontend está configurado corretamente
	@echo "$(YELLOW)Verificando configuração do frontend...$(NC)"
ifeq ($(OS),Windows_NT)
	@if not exist "$(FRONTEND_DIR)\node_modules" ( \
		echo $(RED)✗ Dependências do frontend não instaladas$(NC) && \
		echo $(YELLOW)Execute: make setup-frontend$(NC) && \
		exit 1 \
	)
else
	@if [ ! -d "$(FRONTEND_DIR)/node_modules" ]; then \
		echo "$(RED)✗ Dependências do frontend não instaladas$(NC)"; \
		echo "$(YELLOW)Execute: make setup-frontend$(NC)"; \
		exit 1; \
	fi
endif
	@echo "$(GREEN)✓ Frontend configurado$(NC)"

create-super-admin: check-backend-env ## Cria um super admin interativamente (solicita dados no terminal)
	@echo "$(YELLOW)Criando super admin...$(NC)"
	@echo "$(BLUE)Você será solicitado a informar:$(NC)"
	@echo "  - Nome completo"
	@echo "  - Email"
	@echo "  - Senha (oculta)"
	@echo "  - Confirmação de senha (oculta)"
	@echo ""
ifeq ($(OS),Windows_NT)
	@cd $(BACKEND_DIR) && go run cmd/create-super-admin/main.go
else
	@cd $(BACKEND_DIR) && go run cmd/create-super-admin/main.go
endif
