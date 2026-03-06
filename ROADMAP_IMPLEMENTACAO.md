# 🗺️ Roadmap de Implementação - Sistema de Conserto

## 📊 Status Atual vs. Documentação

### ✅ **JÁ IMPLEMENTADO**

#### Backend
- ✅ Modelos de dados completos:
  - Customer, ServiceOrder, Department, Employee, Product, StatusHistory, AuditLog, Image
  - Profile (sistema de perfis com inicialização automática)
- ✅ Repositórios para todas as entidades
- ✅ Sistema de autenticação (JWT, cookies)
- ✅ Handlers: Auth, Employee, Profile
- ✅ Middleware de auditoria (AuditMiddleware)
- ✅ Middleware de permissões (RequireAuth, RequireAdmin, RequireSuperAdmin, RequireAdminOrSuperAdmin)
- ✅ Sistema de tratamento de erros seguro
- ✅ CORS configurado e validado
- ✅ Validação de limite de super_admins (máximo 3)
- ✅ Comando `make create-super-admin` para criação interativa

#### Frontend
- ✅ Tipos TypeScript para todas as entidades
- ✅ Landing page (Home) - Marketing/Contato
- ✅ Página de Login funcional
- ✅ Dashboard básico com layout
- ✅ Sistema de autenticação (useAuth hook)
- ✅ Tratamento de erros intuitivo e seguro
- ✅ Integração frontend-backend funcionando

---

## ❌ **FALTA IMPLEMENTAR**

### 🔴 **PRIORIDADE ALTA - Funcionalidades Core**

#### 1. Handlers Backend Faltantes
- ❌ **CustomerHandler** (`backend/internal/handlers/customer_handler.go`)
  - `CreateCustomer` - Criar cliente
  - `GetCustomerByID` - Buscar por ID
  - `GetCustomerByCPF` - Buscar por CPF
  - `GetCustomerByPhone` - Buscar por telefone
  - `ListCustomers` - Listar com filtros
  - `UpdateCustomer` - Atualizar dados
  - `GetCustomerServiceOrders` - Histórico de ordens do cliente

- ❌ **ServiceOrderHandler** (`backend/internal/handlers/service_order_handler.go`)
  - `CreateServiceOrder` - Criar ordem (gerar número único)
  - `GetServiceOrderByID` - Buscar por ID
  - `GetServiceOrderByOrderNumber` - Buscar por número (público)
  - `ListServiceOrders` - Listar com filtros (status, departamento, etc.)
  - `UpdateServiceOrder` - Atualizar dados
  - `UpdateServiceOrderStatus` - Mudar status (com validação e StatusHistory)
  - `AssignServiceOrder` - Atribuir a colaborador
  - `AddNote` - Adicionar observação
  - `GetServiceOrderHistory` - Histórico completo (StatusHistory + AuditLog)

- ❌ **DepartmentHandler** (`backend/internal/handlers/department_handler.go`)
  - `CreateDepartment` - Criar departamento
  - `GetDepartmentByID` - Buscar por ID
  - `ListDepartments` - Listar todos
  - `UpdateDepartment` - Atualizar
  - `GetDepartmentEmployees` - Colaboradores do departamento
  - `GetDepartmentServiceOrders` - Ordens do departamento

#### 2. Rotas Backend Faltantes
- ❌ Rotas `/api/customers/*` (CRUD completo)
- ❌ Rotas `/api/service-orders/*` (CRUD + mudança de status)
- ❌ Rotas `/api/departments/*` (CRUD)
- ❌ Rota pública `/api/public/service-orders/:orderNumber` (consulta sem auth)
- ❌ Rota pública `/api/public/service-orders/search` (busca por CPF/telefone)

#### 3. Funcionalidades de StatusHistory
- ❌ Integração automática ao mudar status de ServiceOrder
- ❌ Registro de quem mudou, quando, status anterior/novo
- ❌ Endpoint para buscar histórico de uma ordem

#### 4. Geração de Número de Ordem
- ❌ Função para gerar número único de ordem (ex: ORD-2024-0001)
- ❌ Validação de unicidade
- ❌ Formato configurável

#### 5. Validação de Transições de Status
- ❌ Implementar `IsValidStatusTransition` em ServiceOrder
- ❌ Validar permissões do Employee para mudar status
- ❌ Bloquear transições inválidas

---

### 🟡 **PRIORIDADE MÉDIA - Interface e UX**

#### 6. Páginas Frontend Faltantes
- ❌ **ServiceOrders** (`FE/client/src/pages/ServiceOrders.tsx`)
  - Lista de ordens com filtros
  - Criação de nova ordem
  - Detalhes da ordem
  - Mudança de status
  - Timeline de histórico

- ❌ **Customers** (`FE/client/src/pages/Customers.tsx`)
  - Lista de clientes
  - Cadastro/edição de cliente
  - Histórico de ordens do cliente
  - Busca por CPF/telefone

- ❌ **Departments** (`FE/client/src/pages/Departments.tsx`)
  - Lista de departamentos
  - Criação/edição
  - Colaboradores do departamento
  - Relatórios do departamento

- ❌ **Portal Público** (`FE/client/src/pages/PublicOrderTracking.tsx`)
  - Busca por número de ordem
  - Busca por CPF
  - Busca por telefone
  - Visualização de status e histórico
  - Timeline visual

#### 7. Componentes Frontend
- ❌ **StatusTimeline** (`FE/client/src/components/StatusTimeline.tsx`)
  - Visualização do histórico de status
  - Mostra quem mudou, quando, status anterior/novo
  - Design Mobile First

- ❌ **OrderForm** (`FE/client/src/components/OrderForm.tsx`)
  - Formulário de criação de ordem
  - Upload de imagens
  - Validação de campos

- ❌ **CustomerForm** (`FE/client/src/components/CustomerForm.tsx`)
  - Formulário de cadastro/edição de cliente
  - Validação de CPF

- ❌ **StatusChangeModal** (`FE/client/src/components/StatusChangeModal.tsx`)
  - Modal para mudança de status
  - Validação de transições
  - Campo de observações

#### 8. Integração de API no Frontend
- ❌ Funções em `FE/client/src/lib/api.ts`:
  - `api.customers.*` - CRUD de clientes
  - `api.serviceOrders.*` - CRUD de ordens
  - `api.departments.*` - CRUD de departamentos
  - `api.public.*` - Endpoints públicos

---

### 🟢 **PRIORIDADE BAIXA - Melhorias e Recursos Avançados**

#### 9. Integração Cloudinary
- ❌ **Backend** (`backend/internal/services/cloudinary.go`)
  - Configuração via variáveis de ambiente
  - Função de upload
  - Função de delete
  - Otimização de imagens

- ❌ **Frontend** (`FE/client/src/lib/cloudinary.ts`)
  - Upload widget ou componente
  - Preview de imagens
  - Validação de tamanho/formato
  - Integração com formulários

- ❌ Rotas backend para upload
  - `POST /api/upload/image` - Upload de imagem
  - `DELETE /api/upload/image/:id` - Deletar imagem

#### 10. Sistema de Relatórios
- ❌ **Backend** (`backend/internal/handlers/report_handler.go`)
  - Relatórios por departamento
  - Relatórios gerais
  - Relatórios de auditoria
  - Exportação PDF/Excel

- ❌ **Frontend** (`FE/client/src/pages/Reports.tsx`)
  - Dashboard de relatórios
  - Filtros por período, departamento
  - Gráficos e visualizações
  - Exportação

#### 11. Design Mobile First Completo
- ❌ Breakpoints responsivos implementados
- ❌ Componentes touch-friendly (mínimo 44x44px)
- ❌ Menu hambúrguer para mobile
- ❌ Bottom navigation para mobile
- ❌ Lazy loading de imagens
- ❌ Code splitting por rota
- ❌ Otimização de bundle size

#### 12. Funcionalidades Mobile-Specific
- ❌ Câmera nativa para upload de fotos
- ❌ Notificações push (futuro)
- ❌ Geolocalização (futuro)

---

## 📋 Checklist Detalhado por Fase

### **FASE 1: CRUD de Entidades Core** ⏳

#### Backend
- [ ] Criar `CustomerHandler` com todos os métodos
- [ ] Criar `ServiceOrderHandler` com todos os métodos
- [ ] Criar `DepartmentHandler` com todos os métodos
- [ ] Implementar geração de número de ordem único
- [ ] Adicionar rotas no `router.go`:
  - [ ] `/api/customers/*`
  - [ ] `/api/service-orders/*`
  - [ ] `/api/departments/*`
- [ ] Descomentar repositórios no `router.go`
- [ ] Testar todos os endpoints

#### Frontend
- [ ] Adicionar funções de API em `api.ts`:
  - [ ] `api.customers.*`
  - [ ] `api.serviceOrders.*`
  - [ ] `api.departments.*`
- [ ] Criar página `ServiceOrders.tsx`
- [ ] Criar página `Customers.tsx`
- [ ] Criar página `Departments.tsx`
- [ ] Adicionar rotas no `App.tsx`
- [ ] Adicionar itens de menu no `DashboardLayout`

---

### **FASE 2: Sistema de Status e Histórico** ⏳

#### Backend
- [ ] Implementar `UpdateServiceOrderStatus` com validação
- [ ] Integrar criação automática de `StatusHistory`
- [ ] Implementar validação de transições de status
- [ ] Endpoint `GET /api/service-orders/:id/history`
- [ ] Endpoint `GET /api/service-orders/:id/status-history`

#### Frontend
- [ ] Criar componente `StatusTimeline.tsx`
- [ ] Criar componente `StatusChangeModal.tsx`
- [ ] Integrar mudança de status na página de ordens
- [ ] Mostrar timeline de histórico

---

### **FASE 3: Portal Público** ⏳

#### Backend
- [ ] Criar rotas públicas (sem auth):
  - [ ] `GET /api/public/service-orders/:orderNumber`
  - [ ] `POST /api/public/service-orders/search` (CPF/telefone)
- [ ] Validar segurança (sem expor dados sensíveis)

#### Frontend
- [ ] Criar página `PublicOrderTracking.tsx`
- [ ] Formulário de busca (número/CPF/telefone)
- [ ] Visualização de status e histórico
- [ ] Adicionar rota pública no `App.tsx`
- [ ] Link na landing page

---

### **FASE 4: Upload de Imagens (Cloudinary)** ⏳

#### Backend
- [ ] Instalar SDK do Cloudinary
- [ ] Criar `backend/internal/services/cloudinary.go`
- [ ] Configurar variáveis de ambiente
- [ ] Endpoint `POST /api/upload/image`
- [ ] Endpoint `DELETE /api/upload/image/:id`
- [ ] Integrar upload na criação de ServiceOrder

#### Frontend
- [ ] Instalar SDK do Cloudinary (se necessário)
- [ ] Criar componente `ImageUpload.tsx`
- [ ] Integrar no formulário de ordem
- [ ] Preview de imagens
- [ ] Validação de tamanho/formato

---

### **FASE 5: Relatórios** ⏳

#### Backend
- [ ] Criar `ReportHandler`
- [ ] Endpoints de relatórios:
  - [ ] `GET /api/reports/department/:id`
  - [ ] `GET /api/reports/general`
  - [ ] `GET /api/reports/audit`
- [ ] Agregações MongoDB
- [ ] Exportação PDF/Excel (futuro)

#### Frontend
- [ ] Criar página `Reports.tsx`
- [ ] Dashboard de relatórios
- [ ] Gráficos (usar biblioteca de charts)
- [ ] Filtros e exportação

---

### **FASE 6: Mobile First e UX** ⏳

#### Design
- [ ] Revisar todos os componentes para mobile
- [ ] Implementar breakpoints consistentes
- [ ] Garantir touch-friendly (44x44px mínimo)
- [ ] Menu hambúrguer funcional
- [ ] Bottom navigation para mobile
- [ ] Testar em dispositivos reais

#### Performance
- [ ] Lazy loading de imagens
- [ ] Code splitting por rota
- [ ] Otimizar bundle size
- [ ] Compressão de imagens no Cloudinary

---

## 🎯 Ordem Recomendada de Implementação

1. **FASE 1** - CRUD Core (Customer, ServiceOrder, Department)
   - Base para tudo funcionar
   - Permite criar e gerenciar ordens

2. **FASE 2** - Status e Histórico
   - Funcionalidade essencial do sistema
   - Rastreabilidade completa

3. **FASE 3** - Portal Público
   - Funcionalidade chave para clientes
   - Não requer autenticação

4. **FASE 4** - Cloudinary
   - Melhora UX com upload de fotos
   - Importante para identificação de problemas

5. **FASE 5** - Relatórios
   - Analytics e tomada de decisão
   - Pode ser implementado em paralelo

6. **FASE 6** - Mobile First
   - Refinamento e otimização
   - Pode ser feito incrementalmente

---

## 📝 Notas Importantes

### Segurança
- ✅ CORS já configurado
- ✅ Autenticação funcionando
- ✅ Middleware de auditoria ativo
- ⚠️ Validar permissões em todos os handlers novos
- ⚠️ Validar entrada de dados (CPF, telefone, etc.)

### Performance
- ⚠️ Implementar paginação nas listagens
- ⚠️ Índices MongoDB já criados nos repositórios
- ⚠️ Cache de relatórios (futuro)

### Testes
- ⚠️ Criar testes unitários para handlers
- ⚠️ Testes de integração para fluxos completos
- ⚠️ Testes E2E para portal público

---

## 🔗 Arquivos de Referência

- **Documentação completa**: `SISTEMA_CONSERTO.md`
- **Modelos**: `backend/internal/models/*.go`
- **Repositórios**: `backend/internal/repository/*.go`
- **Handlers existentes**: `backend/internal/handlers/employee_handler.go` (usar como referência)
- **Tipos frontend**: `FE/client/src/types/index.ts`

---

**Última atualização**: Baseado na análise do código atual vs. documentação SISTEMA_CONSERTO.md
