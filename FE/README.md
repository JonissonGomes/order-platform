# Order Platform

Uma plataforma moderna e escalável para gerenciamento de pedidos, construída com tecnologias de ponta para oferecer uma experiência de usuário excepcional e uma arquitetura robusta e fácil de manter.

## 📋 Sobre o Projeto

O Order Platform é um sistema completo de gerenciamento de pedidos que combina uma interface moderna e intuitiva com uma arquitetura backend robusta. A plataforma foi desenvolvida com foco em escalabilidade, manutenibilidade e experiência do usuário, utilizando as melhores práticas de desenvolvimento de software.

### Principais Características

- 🔐 **Autenticação JWT**: Sistema de autenticação seguro com email e senha
- 🎨 **Interface Moderna**: UI construída com componentes Radix UI e Tailwind CSS
- 🚀 **Performance**: Build otimizado com Vite para carregamento rápido
- 📊 **Gerenciamento de Estado**: React Query para gerenciamento eficiente de estado e cache
- 🗄️ **Banco de Dados**: MongoDB Atlas para armazenamento de dados
- 🎯 **TypeScript**: Tipagem estática em todo o projeto para maior segurança e produtividade
- ⚡ **Backend Go**: API RESTful desenvolvida em Go com Gin framework

## 🛠️ Tecnologias Utilizadas

### Frontend
- **React 19** - Biblioteca para construção de interfaces
- **TypeScript** - Tipagem estática
- **Vite** - Build tool e dev server
- **Wouter** - Roteamento leve e moderno
- **React Query (TanStack Query)** - Gerenciamento de estado e cache
- **Radix UI** - Componentes acessíveis e customizáveis
- **Tailwind CSS** - Framework CSS utility-first
- **Framer Motion** - Animações fluidas
- **React Hook Form** - Gerenciamento de formulários
- **Zod** - Validação de schemas

### Backend
- **Go** - Linguagem de programação backend
- **Gin** - Framework web HTTP para Go
- **MongoDB Atlas** - Banco de dados NoSQL na nuvem
- **JWT** - Autenticação baseada em tokens
- **JWT** - Autenticação baseada em tokens

### Ferramentas de Desenvolvimento
- **Vitest** - Framework de testes
- **Prettier** - Formatador de código
- **Drizzle Kit** - Ferramentas de migração de banco de dados

## 📦 Pré-requisitos

Antes de começar, certifique-se de ter instalado:

- **Node.js** (versão 18 ou superior) - Para o frontend
- **Go** (versão 1.21 ou superior) - Para o backend
- **pnpm** (versão 10.4.1 ou superior) - Gerenciador de pacotes
- **MongoDB Atlas** - Banco de dados (conta gratuita disponível)
- **Git** - Controle de versão

## 🚀 Instalação

1. **Clone o repositório** (se ainda não tiver feito):
```bash
git clone <url-do-repositorio>
cd order-platform/FE
```

2. **Instale as dependências**:
```bash
pnpm install
```

3. **Configure as variáveis de ambiente**:
   Crie um arquivo `.env` na raiz do diretório `FE/` com as seguintes variáveis:

```env
# URL base da API Go (sem barra no final)
ZTS_API_BASE_URL=http://localhost:8080

# Google Maps (opcional)
# ZTS_GOOGLE_MAPS_API_KEY=sua-chave-google-maps
```

4. **Configure o backend Go**:
   - Navegue até o diretório do backend:
   ```bash
   cd ../backend
   ```
   - Siga as instruções no `backend/README.md` para configurar o backend
   - Configure o MongoDB Atlas e atualize a `DATABASE_URL` no arquivo `.env` do backend

## ▶️ Como Executar

### Modo Desenvolvimento

O projeto é composto por frontend (React) e backend (Go). Você precisa executar ambos:

1. **Inicie o backend Go** (em um terminal):
```bash
cd ../backend
go run cmd/server/main.go
```
O backend será iniciado em `http://localhost:8080` (ou na porta configurada em `PORT`).

2. **Inicie o frontend** (em outro terminal):
```bash
cd FE
pnpm dev
```

O frontend será iniciado em `http://localhost:3000` (ou na próxima porta disponível).

O Vite irá:
- Compilar o frontend automaticamente
- Recarregar a página quando houver mudanças (Hot Module Replacement)
- Fazer proxy das requisições para o backend Go

### Modo Produção

1. **Build do projeto**:
```bash
pnpm build
```

2. **Inicie o servidor de produção**:
```bash
pnpm start
```

## 📜 Scripts Disponíveis

| Script | Descrição |
|--------|-----------|
| `pnpm dev` | Inicia o servidor de desenvolvimento com hot-reload |
| `pnpm build` | Compila o projeto para produção |
| `pnpm start` | Inicia o servidor de produção |
| `pnpm check` | Verifica erros de TypeScript sem compilar |
| `pnpm format` | Formata o código com Prettier |
| `pnpm test` | Executa os testes com Vitest |

## 🔧 Configuração Adicional

### Banco de Dados

O projeto utiliza MongoDB Atlas como banco de dados. O backend Go gerencia a conexão e as operações de banco de dados.

Para configurar o MongoDB Atlas:
1. Crie uma conta no [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Crie um cluster (Free tier disponível)
3. Configure um usuário de banco de dados
4. Adicione seu IP à whitelist
5. Obtenha a connection string e configure em `DATABASE_URL` no backend

### Autenticação

O sistema utiliza autenticação JWT com email e senha. O frontend faz chamadas REST para:

- `POST /api/auth/register` - Registro de novo usuário
- `POST /api/auth/login` - Login de usuário
- `GET /api/auth/me` - Verificar usuário autenticado
- `POST /api/auth/logout` - Logout

As requisições incluem cookies automaticamente para manter a sessão.

### Variáveis de Ambiente (client)

Somente variáveis com prefixo `ZTS_` entram no bundle do browser (`envPrefix` no Vite). Veja `FE/.env.example`:

- `ZTS_API_BASE_URL` — URL da API Go
- `ZTS_GOOGLE_MAPS_API_KEY` — opcional, mapas

⚠️ **Importante**: Nunca commite o arquivo `.env` com credenciais reais. Use `.env.example` como template. Na Vercel, configure `ZTS_API_BASE_URL` apontando para o Render. Valores `ZTS_*` são públicos no JS do client — não coloque segredos.

## 🏗️ Arquitetura

### Frontend
- **Roteamento**: Wouter para navegação entre páginas
- **Estado Global**: React Query para cache e sincronização de dados
- **Autenticação**: Hook `useAuth` para gerenciar estado de autenticação
- **Componentes**: Sistema de componentes baseado em Radix UI com Tailwind CSS

### Backend
- **API**: RESTful API desenvolvida em Go
- **Autenticação**: JWT com cookies HTTP-only
- **Banco de Dados**: MongoDB Atlas
- **Framework**: Gin para processamento de requisições HTTP

### Comunicação
- **REST API**: Comunicação via HTTP entre frontend e backend
- **React Query**: Cache e sincronização automática de dados
- **Fetch API**: Cliente HTTP nativo para requisições à API

## 🧪 Testes

Execute os testes com:

```bash
pnpm test
```

Os testes estão configurados com Vitest e podem ser encontrados em arquivos `*.test.ts` ou `*.spec.ts`.

## 📝 Desenvolvimento

### Adicionando Novas Funcionalidades

1. **Novas Rotas da API**: Adicione handlers em `backend/internal/handlers/` e rotas em `backend/internal/router/router.go`
2. **Novas Páginas**: Crie em `client/src/pages/`
3. **Novos Componentes**: Adicione em `client/src/components/`
4. **Novos Models**: Defina em `backend/internal/models/` e repositories em `backend/internal/repository/`

### Convenções de Código

- Use TypeScript para tipagem estática
- Siga os padrões de formatação do Prettier
- Mantenha componentes pequenos e focados
- Divida arquivos grandes em módulos menores
- Use hooks customizados para lógica reutilizável

## 🤝 Contribuindo

1. Faça um fork do projeto
2. Crie uma branch para sua feature (`git checkout -b feature/AmazingFeature`)
3. Commit suas mudanças (`git commit -m 'Add some AmazingFeature'`)
4. Push para a branch (`git push origin feature/AmazingFeature`)
5. Abra um Pull Request

## 📄 Licença

Este projeto está sob a licença MIT. Veja o arquivo `LICENSE` para mais detalhes.

## 🆘 Suporte

Para problemas ou dúvidas:
1. Verifique se todas as variáveis de ambiente estão configuradas corretamente
2. Certifique-se de que o banco de dados está acessível
3. Verifique os logs do servidor para erros
4. Abra uma issue no repositório

---

Desenvolvido com ❤️ usando as melhores tecnologias modernas.
