# Especificação Técnica — Assessor Financeiro + Agenda + Dashboard (LGPD)

## 1) Arquitetura
- WhatsApp → Backend (Webhook) → DB (Postgres/Supabase) → Jobs (cron) → Dashboard (React).
- Sessão/autenticação:
  - Recomendado: Supabase Auth (e-mail OTP) para o dashboard.
  - No WhatsApp, identificar por número do remetente e resolver `user_id`.
- O backend injeta `app.user_id` na conexão do Postgres por requisição:
  - `SET app.user_id = '<uuid>';` antes das queries.

## 2) Banco de Dados (migrations)
```sql
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

create table users (
  id uuid primary key default gen_random_uuid(),
  wa_number text unique not null,
  created_at timestamptz default now()
);

create table categories (
  id serial primary key,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense','income'))
);

create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text default 'BRL',
  category_id int references categories(id) on delete set null,
  occurred_at date not null,
  note text,
  raw_message text,
  created_at timestamptz default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  remind_minutes int default 60,
  raw_message text,
  created_at timestamptz default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  action text not null, -- 'export' | 'delete' | 'login' | etc.
  meta jsonb,
  created_at timestamptz default now()
);

RLS (ativar e políticas)

alter table users        enable row level security;
alter table categories   enable row level security;
alter table transactions enable row level security;
alter table events       enable row level security;
alter table audit_logs   enable row level security;

create or replace function app_current_user_id()
returns uuid language sql stable as $$
  select current_setting('app.user_id', true)::uuid
$$;

-- SELECT
create policy p_users_select        on users        for select using (id = app_current_user_id());
create policy p_categories_select   on categories   for select using (user_id = app_current_user_id());
create policy p_transactions_select on transactions for select using (user_id = app_current_user_id());
create policy p_events_select       on events       for select using (user_id = app_current_user_id());
create policy p_audit_select        on audit_logs   for select using (user_id = app_current_user_id());

-- CUD (Create/Update/Delete)
create policy p_categories_cud   on categories   for all using (user_id = app_current_user_id()) with check (user_id = app_current_user_id());
create policy p_transactions_cud on transactions for all using (user_id = app_current_user_id()) with check (user_id = app_current_user_id());
create policy p_events_cud       on events       for all using (user_id = app_current_user_id()) with check (user_id = app_current_user_id());
create policy p_audit_cud        on audit_logs   for all using (user_id = app_current_user_id()) with check (user_id = app_current_user_id());

3) Backend (pontos-chave)
	•	Middlewares: resolver sessão/usuário, fazer SET app.user_id, rate limiting, CORS restrito.
	•	Webhook WhatsApp:
	•	GET /whatsapp/webhook (verify token).
	•	POST /whatsapp/webhook (idempotência por message_id; parsing e roteamento).
	•	Parser (src/nlp/parse.ts):
	•	Regex PT-BR:
	•	Valor: /(?:r\$?\s*)?(\d{1,4}(?:[.,]\d{1,2})?)/i
	•	Datas relativas: hoje/ontem/amanhã; “sex 10h”; “18/10 14:30”.
	•	Dicionário de categorias (mercado/alimentação, uber/transporte, etc.).
	•	Fallback LLM opcional via env.
	•	Rotas:
	•	/me, /transactions, /categories, /events,
	•	/reports/summary,
	•	/privacy/export, /privacy/delete, /privacy/delete/confirm.
	•	Jobs (src/jobs/*):
	•	Lembretes de eventos (starts_at - remind_minutes).
	•	Resumo diário/mensal (WhatsApp template).
	•	Privacidade (src/privacy/*):
	•	Exportador CSV (e PDF simples).
	•	Deleção em 2 passos + audit_logs.

4) Frontend
	•	React + Vite + TS + Tailwind.
	•	Páginas:
	•	Login (OTP) + consentimento LGPD.
	•	Dashboard (cards do mês, variação vs mês anterior).
	•	Transações (tabela com filtros, edição inline, import/export CSV).
	•	Categorias (CRUD).
	•	Agenda (calendário CRUD + lembretes).
	•	Relatórios (gráficos, export CSV/PDF).
	•	Privacidade (Baixar Meus Dados; Excluir Conta/Dados com dupla confirmação).
	•	Toda chamada de API usa sessão; UI exibe somente dados do usuário logado.

5) .env.example (sugerido)

# Backend
PORT=3001
NODE_ENV=development
DATABASE_URL=postgres://user:pass@localhost:5432/assessor
JWT_SECRET=change-me
TZ=America/Sao_Paulo

# WhatsApp
WA_VERIFY_TOKEN=change-me
WA_ACCESS_TOKEN=change-me
WA_PHONE_NUMBER_ID=change-me

# LLM (opcional)
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
LLM_ENABLED=false

# Frontend
VITE_API_URL=http://localhost:3001

6) Scripts (exemplos)
	•	backend:
	•	"dev": "tsx src/index.ts"
	•	"start": "node dist/index.js"
	•	"migrate": "node scripts/migrate.js"
	•	"test": "vitest run"
	•	frontend:
	•	"dev": "vite"
	•	"build": "vite build"
	•	"preview": "vite preview"

7) Testes mínimos
	•	Parser: extrair amount, date, category.
	•	Segurança/RLS: usuário A não enxerga dados do B.
	•	Export/Exclusão: apenas do próprio usuário; audit_logs registra.
	•	Webhook: ignora duplicatas (mesmo message_id).

8) LGPD — práticas aplicadas
	•	Minimização (guardar só o necessário).
	•	Consentimento e termos (onboarding).
	•	Portabilidade (export CSV/PDF).
	•	Esquecimento (deleção em 2 passos).
	•	Criptografia (HTTPS + repouso no DB/fornecedor).
	•	Auditoria de ações sensíveis.

9) Critérios de aceite (checklist)
	•	docker compose up sobe DB, backend e frontend.
	•	RLS ativo e políticas por user_id aplicadas a todas as tabelas.
	•	Webhook processa mensagem simulada e cria transação/evento.
	•	Dashboard mostra apenas dados do usuário logado.
	•	Export/Excluir funcionam e registram em audit_logs.
	•	Testes de segurança passam.

---

se quiser, no próximo passo eu te mando **(opcional)** um pacote com:
- `docker-compose.yml` (Postgres + pgAdmin + serviços),
- esqueleto de pastas e `package.json` de backend/frontend,
- um **parser inicial** pronto.  
é só falar “manda o esqueleto” que eu já deixo redondinho.