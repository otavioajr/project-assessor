-- Assessor Financeiro + Agenda - Schema Inicial com RLS e LGPD
-- Timezone: America/Sao_Paulo | Locale: PT-BR

-- Extensões necessárias
create extension if not exists "uuid-ossp";
create extension if not exists pgcrypto;

-- ==============================================
-- TABELA: users
-- ==============================================
create table users (
  id uuid primary key default gen_random_uuid(),
  wa_number text unique not null,
  email text unique,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_users_wa_number on users(wa_number);

-- ==============================================
-- TABELA: categories
-- ==============================================
create table categories (
  id serial primary key,
  user_id uuid not null references users(id) on delete cascade,
  name text not null,
  kind text not null check (kind in ('expense','income')),
  is_system boolean default false, -- Categorias do sistema não podem ser deletadas
  created_at timestamptz default now(),
  unique(user_id, name, kind)
);

create index idx_categories_user_id on categories(user_id);

-- ==============================================
-- TABELA: transactions
-- ==============================================
create table transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  amount numeric(12,2) not null,
  currency text default 'BRL',
  category_id int references categories(id) on delete set null,
  occurred_at date not null,
  note text,
  raw_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_transactions_user_id on transactions(user_id);
create index idx_transactions_occurred_at on transactions(occurred_at);
create index idx_transactions_category_id on transactions(category_id);

-- ==============================================
-- TABELA: events
-- ==============================================
create table events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  remind_minutes int default 60,
  reminded_at timestamptz,
  raw_message text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index idx_events_user_id on events(user_id);
create index idx_events_starts_at on events(starts_at);

-- ==============================================
-- TABELA: audit_logs
-- ==============================================
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  action text not null, -- 'export' | 'delete' | 'login' | 'create_transaction' | etc.
  meta jsonb,
  created_at timestamptz default now()
);

create index idx_audit_logs_user_id on audit_logs(user_id);
create index idx_audit_logs_action on audit_logs(action);

-- ==============================================
-- TABELA: message_idempotency (para WhatsApp)
-- ==============================================
create table message_idempotency (
  message_id text primary key,
  processed_at timestamptz default now()
);

-- Limpar mensagens antigas (> 7 dias)
create index idx_message_idempotency_processed_at on message_idempotency(processed_at);

-- ==============================================
-- TABELA: pending_transactions (aguardando categoria)
-- ==============================================
create table pending_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references users(id) on delete cascade,
  amount numeric(12,2) not null,
  occurred_at date not null,
  note text,
  raw_message text,
  is_income boolean default false,
  created_at timestamptz default now()
);

create index idx_pending_transactions_user_id on pending_transactions(user_id);

-- Limpar pending antigas (> 24h)
create index idx_pending_transactions_created_at on pending_transactions(created_at);

-- ==============================================
-- RLS (Row Level Security)
-- ==============================================

-- Ativar RLS em todas as tabelas de dados do usuário
alter table users        enable row level security;
alter table categories   enable row level security;
alter table transactions enable row level security;
alter table events       enable row level security;
alter table audit_logs   enable row level security;

-- Função helper para obter o user_id da sessão
create or replace function app_current_user_id()
returns uuid language sql stable as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

-- Políticas SELECT
create policy p_users_select        on users        for select using (id = app_current_user_id());
create policy p_categories_select   on categories   for select using (user_id = app_current_user_id());
create policy p_transactions_select on transactions for select using (user_id = app_current_user_id());
create policy p_events_select       on events       for select using (user_id = app_current_user_id());
create policy p_audit_select        on audit_logs   for select using (user_id = app_current_user_id());

-- Políticas CUD (Create/Update/Delete)
create policy p_categories_cud   on categories   for all using (user_id = app_current_user_id()) with check (user_id = app_current_user_id());
create policy p_transactions_cud on transactions for all using (user_id = app_current_user_id()) with check (user_id = app_current_user_id());
create policy p_events_cud       on events       for all using (user_id = app_current_user_id()) with check (user_id = app_current_user_id());
create policy p_audit_cud        on audit_logs   for all using (user_id = app_current_user_id()) with check (user_id = app_current_user_id());

-- ==============================================
-- FUNÇÃO: Criar categorias padrão para novo usuário
-- ==============================================
create or replace function create_default_categories(p_user_id uuid)
returns void language plpgsql as $$
begin
  insert into categories (user_id, name, kind, is_system) values
    -- Categorias de despesa (sistema)
    (p_user_id, 'Custos Fixos', 'expense', true),
    (p_user_id, 'Conforto', 'expense', true),
    (p_user_id, 'Liberdade Financeira', 'expense', true),
    (p_user_id, 'Aumentar Renda/Empreender', 'expense', true),
    (p_user_id, 'Prazeres', 'expense', true),
    (p_user_id, 'Metas', 'expense', true),
    (p_user_id, 'Prazeres Futuros', 'expense', true),
    (p_user_id, 'Reserva de Oportunidade', 'expense', true),
    -- Categoria de receita (sistema) - apenas Salário
    (p_user_id, 'Salário', 'income', true);
end;
$$;

-- ==============================================
-- TRIGGER: Atualizar updated_at automaticamente
-- ==============================================
create or replace function update_updated_at_column()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_users_updated_at before update on users
  for each row execute function update_updated_at_column();

create trigger update_transactions_updated_at before update on transactions
  for each row execute function update_updated_at_column();

create trigger update_events_updated_at before update on events
  for each row execute function update_updated_at_column();

-- ==============================================
-- VIEWS: Para facilitar queries comuns
-- ==============================================

-- View: Saldo do mês atual
create or replace view v_monthly_balance as
select
  t.user_id,
  date_trunc('month', t.occurred_at) as month,
  sum(case when c.kind = 'income' then t.amount else 0 end) as total_income,
  sum(case when c.kind = 'expense' then t.amount else 0 end) as total_expense,
  sum(case when c.kind = 'income' then t.amount else -t.amount end) as balance
from transactions t
left join categories c on t.category_id = c.id
group by t.user_id, date_trunc('month', t.occurred_at);

-- View: Gastos por categoria no mês
create or replace view v_expenses_by_category as
select
  t.user_id,
  date_trunc('month', t.occurred_at) as month,
  c.name as category,
  sum(t.amount) as total
from transactions t
join categories c on t.category_id = c.id
where c.kind = 'expense'
group by t.user_id, date_trunc('month', t.occurred_at), c.name;

-- ==============================================
-- COMENTÁRIOS
-- ==============================================
comment on table users is 'Usuários do sistema, identificados por número de WhatsApp';
comment on table categories is 'Categorias de transações (despesas e receitas), isoladas por usuário';
comment on table transactions is 'Transações financeiras (despesas e receitas)';
comment on table events is 'Eventos de agenda com lembretes';
comment on table audit_logs is 'Log de auditoria para ações sensíveis (LGPD)';
comment on table message_idempotency is 'Controle de idempotência para mensagens do WhatsApp';

comment on function app_current_user_id() is 'Retorna o UUID do usuário da sessão atual (app.user_id)';
comment on function create_default_categories(uuid) is 'Cria categorias padrão para um novo usuário';
