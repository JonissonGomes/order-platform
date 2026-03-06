# Order Platform

Uma plataforma moderna e escalável para gerenciamento de pedidos, construída com tecnologias de ponta para oferecer uma experiência de usuário excepcional e uma arquitetura robusta e fácil de manter.

## 📋 Sobre o Projeto

O Order Platform é um sistema completo de gerenciamento de pedidos que combina uma interface moderna e intuitiva (React) com uma arquitetura backend robusta (Go). A plataforma foi desenvolvida com foco em escalabilidade, manutenibilidade e experiência do usuário.

## 🏗️ Arquitetura do Projeto

O projeto é dividido em duas partes principais:

- **Frontend** (`FE/`) - Aplicação React com TypeScript, Vite, e componentes modernos
- **Backend** (`backend/`) - API RESTful desenvolvida em Go com Gin framework e MongoDB Atlas

## 🛠️ Stack Tecnológica

### Frontend
- React 19 + TypeScript
- Vite para build e desenvolvimento
- Radix UI + Tailwind CSS
- React Query para gerenciamento de estado
- Wouter para roteamento

### Backend
- Go 1.21+
- Gin Framework
- MongoDB Atlas
- JWT para autenticação
- bcrypt para hash de senhas

## 🚀 Início Rápido

> **Novo no projeto?** 
> - **Windows:** Veja o [Guia de Início Rápido](./QUICK_START.md)
> - **WSL/Linux:** Veja o [Guia de Setup WSL](./SETUP_WSL.md)

### Pré-requisitos

- **Node.js** 18+ (para frontend) - [Windows](https://nodejs.org/) | [WSL/Linux](./INSTALL_NODE_WSL.md)
- **Go** 1.21+ (para backend) - [Instalar no Windows](./INSTALL_GO_WINDOWS.md)
- **pnpm** 10.4.1+ (gerenciador de pacotes) - opcional, npm também funciona
- **MongoDB Atlas** (conta gratuita disponível) - [Criar conta](https://www.mongodb.com/cloud/atlas)
- **Make** - Para usar o Makefile - [Instalar no Windows](./INSTALL_MAKE_WINDOWS.md)

### Instalação Rápida

#### Opção 1: Usando Makefile (Recomendado - Funciona no Windows também!)

**No Windows:** Use Git Bash ou instale make (veja [INSTALL_MAKE_WINDOWS.md](./INSTALL_MAKE_WINDOWS.md))

```bash
# Clone o repositório
git clone <url-do-repositorio>
cd order-platform

# Ver comandos disponíveis
make help

# Setup completo (configura backend e frontend)
make setup

# Ou configure separadamente
make setup-backend
make setup-frontend
```

#### Opção 2: Usando Scripts PowerShell (Windows - Alternativa)

```powershell
# Clone o repositório
git clone <url-do-repositorio>
cd order-platform

# Setup completo
.\setup.ps1
```

#### Opção 3: Manual

1. **Configure o Backend**:
```bash
cd backend
cp .env.example .env
# Edite o .env com suas credenciais
go mod download
```

2. **Configure o Frontend**:
```bash
cd FE
pnpm install
# ou npm install --legacy-peer-deps
```

### Executando o Projeto

#### Opção 1: Usando Makefile (Recomendado)

```bash
# No Windows: Use Git Bash ou terminal com make instalado
# No Linux/Mac: Use qualquer terminal

# Inicia backend e frontend (em janelas separadas no Windows)
make dev

# Ou separadamente
make dev-backend    # Backend na porta 8080
make dev-frontend   # Frontend na porta 3000
```

#### Opção 2: Usando Scripts PowerShell (Windows - Alternativa)

```powershell
# Inicia backend e frontend em janelas separadas
.\run-dev.ps1
```

#### Opção 3: Manual

1. **Terminal 1 - Backend**:
```bash
cd backend
go run cmd/server/main.go
```

2. **Terminal 2 - Frontend**:
```bash
cd FE
pnpm dev
# ou npm run dev
```

O backend estará disponível em `http://localhost:8080` e o frontend em `http://localhost:3000`.

### Comandos Disponíveis (Makefile)

Execute `make help` para ver todos os comandos disponíveis:

- `make setup` - Configura todo o ambiente
- `make dev` - Inicia backend e frontend
- `make build` - Build para produção
- `make test` - Executa testes
- `make clean` - Limpa arquivos de build
- E mais...

## 📝 Estrutura do Projeto

```
order-platform/
├── FE/                   # Frontend React
│   ├── client/           # Aplicação React
│   ├── server/           # (Legado - será removido)
│   └── README.md         # Documentação do frontend
├── backend/              # Backend Go
│   ├── cmd/              # Aplicação principal
│   ├── internal/         # Código interno
│   └── README.md         # Documentação do backend
├── Makefile              # Comandos para execução
└── README.md             # Este arquivo
```

## 🔧 Configuração

### Variáveis de Ambiente

#### Backend (`.env` em `backend/`)

O arquivo `.env` é criado automaticamente a partir de `backend/.env.example` quando você executa `make setup-backend`.

Edite `backend/.env` com suas credenciais reais após o setup.

#### Frontend (`.env` em `FE/`)

O arquivo `.env` é criado automaticamente a partir de `FE/.env.example` quando você executa `make setup-frontend`.

Edite `FE/.env` com suas credenciais reais após o setup.

**Nota:** Os arquivos `.env.example` contêm templates com todas as variáveis necessárias. Eles são copiados para `.env` automaticamente durante o setup.

## 🧪 Testes

### Backend
```bash
cd backend
go test ./...
```

### Frontend
```bash
cd FE
pnpm test
```

## 📄 Licença

Este projeto está sob a licença MIT.


Desenvolvido com ❤️ usando as melhores tecnologias modernas.
