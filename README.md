# epStudio — Gerenciador de Marketing

Aplicação web para gerenciamento de chamados e campanhas de marketing internas de uma loja de eletrônicos.

> **Etapa atual:** autenticação + módulo de chamados (ciclo de vida principal).

## Requisitos

- Node.js 20+
- npm 10+
- PostgreSQL 14+ (local ou via Docker)

## Estrutura

```text
epStudio/
├── frontend/   # React + Vite + TypeScript + Tailwind + shadcn/ui
└── backend/    # Node.js + Fastify + TypeScript + Prisma + PostgreSQL
```

## Portas

| Serviço  | URL                   |
|----------|-----------------------|
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:3333 |

## Conceito de chamados

Cada chamado (`Campaign`) é uma solicitação interna de marketing: campanha, promoção, banner, Reels, stories, inauguração, etc.

### Status

| Status | Significado |
|--------|-------------|
| `DRAFT` | Rascunho não enviado |
| `OPEN` | Aberto, aguardando atendimento |
| `IN_ANALYSIS` | Assumido / em análise |
| `IN_PROGRESS` | Em execução |
| `WAITING_REQUESTER` | Aguardando informação do solicitante |
| `WAITING_APPROVAL` | Aguardando aprovação |
| `COMPLETED` | Finalizado |
| `CANCELLED` | Cancelado |

### Prioridades

`LOW` · `MEDIUM` (padrão) · `HIGH` · `URGENT`

### Regra de datas

- `dueAt` não pode ser anterior ao momento da criação/edição
- `startsAt` é opcional e **pode** ser posterior a `dueAt` (data informativa de planejamento)

### Transições permitidas

```text
DRAFT → OPEN, CANCELLED
OPEN → IN_ANALYSIS, CANCELLED
IN_ANALYSIS → IN_PROGRESS, WAITING_REQUESTER, CANCELLED
IN_PROGRESS → WAITING_REQUESTER, WAITING_APPROVAL, COMPLETED, CANCELLED
WAITING_REQUESTER → IN_ANALYSIS, IN_PROGRESS, CANCELLED
WAITING_APPROVAL → IN_PROGRESS, COMPLETED, CANCELLED
COMPLETED → (somente reabertura ADMIN)
CANCELLED → (somente reabertura ADMIN)
```

### Visibilidade

| Papel | Vê |
|-------|----|
| `REQUESTER` | Somente os próprios |
| `MARKETING_MANAGER` | `OPEN` sem responsável + atribuídos a ele |
| `ADMIN` | Todos |

### Assumir chamado

1. Gestor vê chamado `OPEN` sem responsável
2. `POST /campaigns/:id/claim`
3. Status vira `IN_ANALYSIS` e ele vira responsável
4. Concorrência protegida com update atômico → `409` se outro gestor assumiu antes

## Autenticação

Access token JWT em memória + refresh token em cookie `HttpOnly` (`epstudio_refresh_token`), com rotação e revogação.

### Usuários de desenvolvimento

> Apenas local. Não use em produção.

| E-mail | Senha | Papel |
|--------|-------|-------|
| `admin@epstudio.local` | `Admin@123` | ADMIN |
| `gerente@epstudio.local` | `Gerente@123` | REQUESTER |
| `marketing@epstudio.local` | `Marketing@123` | MARKETING_MANAGER |

## Como executar

```bash
# Backend
cd backend
cp .env.example .env
npm install
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
npm run dev

# Frontend
cd frontend
cp .env.example .env
npm install
npm run dev
```

### Scripts úteis

```bash
cd backend
npm run test
npm run prisma:migrate
npm run prisma:seed
```

## Endpoints de autenticação

```http
POST /auth/login
POST /auth/refresh
GET  /auth/me
POST /auth/logout
```

## Endpoints de usuários (ADMIN)

```http
GET   /users
POST  /users
GET   /users/:id
PATCH /users/:id
```

## Endpoints de chamados

```http
POST   /campaigns
GET    /campaigns
GET    /campaigns/summary
GET    /campaigns/:id
PATCH  /campaigns/:id
POST   /campaigns/:id/submit
POST   /campaigns/:id/claim
PATCH  /campaigns/:id/assignee
PATCH  /campaigns/:id/status
POST   /campaigns/:id/cancel
POST   /campaigns/:id/reopen
GET    /campaigns/:id/activities
```

Todos exigem autenticação.

## Exemplos curl

```bash
# Login
curl -c cookies.txt -X POST http://localhost:3333/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"gerente@epstudio.local","password":"Gerente@123"}'

# Criar chamado
curl -X POST http://localhost:3333/campaigns \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Campanha Fecha Mês",
    "description": "Criar materiais para divulgação.",
    "priority": "HIGH",
    "saveAsDraft": false
  }'

# Listar
curl "http://localhost:3333/campaigns?status=OPEN&page=1&limit=20" \
  -H "Authorization: Bearer ACCESS_TOKEN"

# Assumir (gestor de marketing)
curl -X POST http://localhost:3333/campaigns/CAMPAIGN_ID/claim \
  -H "Authorization: Bearer ACCESS_TOKEN"

# Alterar status
curl -X PATCH http://localhost:3333/campaigns/CAMPAIGN_ID/status \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status":"IN_PROGRESS"}'

# Cancelar
curl -X POST http://localhost:3333/campaigns/CAMPAIGN_ID/cancel \
  -H "Authorization: Bearer ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason":"Promoção cancelada pela diretoria."}'
```

## Rotas do frontend

| Rota | Quem acessa |
|------|-------------|
| `/login` | pública |
| `/dashboard` | autenticado |
| `/campaigns` | autenticado |
| `/campaigns/new` | ADMIN, REQUESTER, MARKETING_MANAGER |
| `/campaigns/:id` | autenticado com permissão no recurso |
| `/users` | ADMIN |

## Limitações atuais

Ainda **não** implementados:

- tarefas / Kanban
- comentários
- upload / versões de arquivos
- aprovação de artes
- IA, WhatsApp, Instagram
- notificações em tempo real / e-mails
