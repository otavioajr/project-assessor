# Arquitetura do Sistema - Assessor Financeiro

## Visão Geral

```
┌─────────────┐
│  WhatsApp   │
│   Business  │
└──────┬──────┘
       │ HTTPS
       ▼
┌─────────────────────────────────────────┐
│           BACKEND (Fastify)              │
│                                          │
│  ┌──────────────┐    ┌──────────────┐  │
│  │   Webhook    │    │   REST API   │  │
│  │   Handler    │    │   (CRUD)     │  │
│  └──────┬───────┘    └──────┬───────┘  │
│         │                   │           │
│         └────────┬──────────┘           │
│                  ▼                       │
│         ┌────────────────┐              │
│         │  NLP Parser    │              │
│         │  (PT-BR)       │              │
│         └────────┬───────┘              │
│                  │                       │
│                  ▼                       │
│         ┌────────────────┐              │
│         │   RLS Layer    │              │
│         │ (user_id ctx)  │              │
│         └────────┬───────┘              │
└──────────────────┼──────────────────────┘
                   │
                   ▼
          ┌─────────────────┐
          │   PostgreSQL    │
          │   + RLS Active  │
          └────────┬────────┘
                   │
       ┌───────────┼───────────┐
       ▼           ▼           ▼
  ┌────────┐ ┌─────────┐ ┌─────────┐
  │ users  │ │  trans  │ │ events  │
  │        │ │ actions │ │         │
  └────────┘ └─────────┘ └─────────┘
                   ▲
                   │
                   │
       ┌───────────┴───────────┐
       │                       │
       ▼                       ▼
┌─────────────┐         ┌─────────────┐
│  Cron Jobs  │         │  Dashboard  │
│             │         │   (React)   │
│ • Reminders │         │             │
│ • Summaries │         │  • Charts   │
└─────────────┘         │  • Reports  │
                        │  • LGPD     │
                        └─────────────┘
```

---

## Fluxo de Dados

### 1. Mensagem do WhatsApp

```
Usuário envia: "mercado 52,30 hoje"
        ↓
Webhook recebe (POST /whatsapp/webhook)
        ↓
Verifica idempotência (message_id)
        ↓
Parser extrai:
  - amount: 52.30
  - category: "Alimentação"
  - date: hoje
        ↓
Cria transaction no DB (com RLS)
        ↓
Responde: "✅ Anotado! Alimentação: R$ 52,30"
```

### 2. Consulta no Dashboard

```
Usuário acessa /transactions
        ↓
Frontend chama GET /transactions
        ↓
Backend injeta: SET app.user_id = 'uuid'
        ↓
PostgreSQL RLS filtra automaticamente
        ↓
Retorna apenas transações do usuário
        ↓
Frontend renderiza tabela
```

### 3. Job de Lembrete

```
Cron roda a cada 5 minutos
        ↓
Query: eventos nos próximos 10 min sem reminded_at
        ↓
Para cada evento:
  - Envia mensagem WhatsApp
  - Marca reminded_at = NOW()
```

---

## Camadas de Segurança

```
┌──────────────────────────────────────┐
│  Camada 1: Rate Limiting             │
│  (Fastify Rate Limit)                │
└───────────────┬──────────────────────┘
                ▼
┌──────────────────────────────────────┐
│  Camada 2: Autenticação              │
│  (x-user-id header → Supabase Auth)  │
└───────────────┬──────────────────────┘
                ▼
┌──────────────────────────────────────┐
│  Camada 3: Validação (Zod)           │
│  (Schema validation)                 │
└───────────────┬──────────────────────┘
                ▼
┌──────────────────────────────────────┐
│  Camada 4: RLS Injection             │
│  (SET app.user_id = 'uuid')          │
└───────────────┬──────────────────────┘
                ▼
┌──────────────────────────────────────┐
│  Camada 5: Row Level Security        │
│  (Postgres policies)                 │
└──────────────────────────────────────┘
```

---

## Tecnologias

### Backend
- **Runtime**: Node.js 20+
- **Framework**: Fastify 4.x
- **Language**: TypeScript 5.x
- **Database Client**: node-postgres (pg)
- **Validation**: Zod
- **Cron**: node-cron
- **HTTP Client**: Axios (WhatsApp API)

### Frontend
- **Framework**: React 18
- **Build Tool**: Vite 5
- **Language**: TypeScript 5.x
- **Styling**: TailwindCSS 3.x
- **State**: React Query (TanStack Query)
- **HTTP Client**: Axios
- **Charts**: Recharts
- **Icons**: Lucide React

### Database
- **Engine**: PostgreSQL 15
- **Security**: Row Level Security (RLS)
- **Extensions**: uuid-ossp, pgcrypto

### DevOps
- **Containers**: Docker + Docker Compose
- **CI/CD**: GitHub Actions
- **Admin**: pgAdmin 4

---

## Endpoints da API

### WhatsApp
```
GET  /whatsapp/webhook      # Verificação
POST /whatsapp/webhook      # Receber mensagens
```

### Autenticação
```
GET /auth/me                # Usuário atual
```

### Transações
```
GET    /transactions        # Listar
POST   /transactions        # Criar
PUT    /transactions/:id    # Atualizar
DELETE /transactions/:id    # Excluir
```

### Categorias
```
GET    /categories          # Listar
POST   /categories          # Criar
PUT    /categories/:id      # Atualizar
DELETE /categories/:id      # Excluir
```

### Eventos
```
GET    /events              # Listar
POST   /events              # Criar
PUT    /events/:id          # Atualizar
DELETE /events/:id          # Excluir
```

### Relatórios
```
GET /reports/summary        # Resumo do período
GET /reports/monthly        # Evolução mensal
```

### Privacidade (LGPD)
```
POST /privacy/export             # Exportar dados
POST /privacy/delete             # Solicitar exclusão
POST /privacy/delete/confirm     # Confirmar exclusão
```

---

## Modelo de Dados

```sql
users
├── id (uuid, PK)
├── wa_number (text, unique)
├── email (text)
├── created_at (timestamptz)
└── updated_at (timestamptz)

categories
├── id (serial, PK)
├── user_id (uuid, FK → users)
├── name (text)
├── kind (enum: expense|income)
└── created_at (timestamptz)

transactions
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── amount (numeric)
├── currency (text, default: BRL)
├── category_id (int, FK → categories)
├── occurred_at (date)
├── note (text)
├── raw_message (text)
├── created_at (timestamptz)
└── updated_at (timestamptz)

events
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── title (text)
├── starts_at (timestamptz)
├── remind_minutes (int)
├── reminded_at (timestamptz)
├── raw_message (text)
├── created_at (timestamptz)
└── updated_at (timestamptz)

audit_logs
├── id (uuid, PK)
├── user_id (uuid, FK → users)
├── action (text)
├── meta (jsonb)
└── created_at (timestamptz)
```

---

## Configuração de Ambiente

### Variáveis Essenciais

```env
# Backend
PORT=3001
DATABASE_URL=postgres://user:pass@host:5432/db
JWT_SECRET=secret-key
TZ=America/Sao_Paulo

# WhatsApp
WA_VERIFY_TOKEN=verify-token
WA_ACCESS_TOKEN=access-token
WA_PHONE_NUMBER_ID=phone-id

# Supabase
SUPABASE_URL=https://project.supabase.co
SUPABASE_SERVICE_KEY=service-key
```

---

## Performance

### Otimizações Implementadas

1. **Índices no Banco**
   - `idx_users_wa_number` em users(wa_number)
   - `idx_transactions_user_id` em transactions(user_id)
   - `idx_transactions_occurred_at` em transactions(occurred_at)
   - `idx_events_starts_at` em events(starts_at)

2. **Connection Pooling**
   - Pool size: 20 conexões
   - Idle timeout: 30s

3. **React Query Cache**
   - Stale time configurado
   - Cache invalidation strategy

4. **Rate Limiting**
   - 100 req/min por IP

---

## Monitoramento (TODO)

### Métricas a Monitorar

- [ ] Taxa de erro (5xx)
- [ ] Latência de API (p95, p99)
- [ ] Uso de CPU/Memória
- [ ] Conexões ativas no DB
- [ ] Taxa de sucesso do webhook
- [ ] Mensagens processadas/min

### Logs Importantes

- Webhook recebido
- Parser falhou
- RLS violation
- Audit log (export/delete)
- Job executado

---

## Escalabilidade

### Horizontal Scaling Ready

```
Load Balancer
    │
    ├─── Backend Instance 1 ────┐
    ├─── Backend Instance 2 ────┤
    └─── Backend Instance N ────┴─── PostgreSQL
                                      (Primary + Replicas)
```

### Gargalos a Observar

1. **Database**: Queries complexas, RLS overhead
2. **WhatsApp API**: Rate limits da Meta
3. **Jobs**: Processamento concorrente de lembretes

---

## Segurança LGPD

### Dados Coletados
- Número WhatsApp (identificação)
- E-mail (opcional, autenticação)
- Transações financeiras (valores, categorias)
- Eventos de agenda (títulos, horários)

### Direitos Implementados
- ✅ **Acesso**: GET /auth/me
- ✅ **Portabilidade**: POST /privacy/export
- ✅ **Esquecimento**: POST /privacy/delete
- ✅ **Auditoria**: audit_logs table

### Retenção de Dados
- Dados mantidos enquanto conta ativa
- Exclusão completa em até 48h após confirmação
- Backup mantido por 30 dias (disaster recovery)

---

## Manutenção

### Tarefas Regulares

**Diário**
- Verificar logs de erro
- Monitorar taxa de sucesso do webhook

**Semanal**
- Analisar uso de recursos
- Revisar audit_logs

**Mensal**
- Atualizar dependências
- Backup manual do banco
- Revisar performance de queries

---

Este documento descreve a arquitetura completa do sistema. Para instruções de setup, veja [QUICKSTART.md](./QUICKSTART.md).
