Você é uma IA engenheira de software experiente. Gere um projeto completo de um “Assessor Financeiro + Assistente de Agenda via WhatsApp + Dashboard Web” com isolamento multiusuário por `user_id` e conformidade LGPD. 

### Objetivo

- Registrar gastos/receitas e compromissos via WhatsApp.
- Enviar relatórios e lembretes pelo WhatsApp.
- Fornecer dashboard web seguro para visualizar/editar/exportar dados.
- Nunca vazar dados entre usuários (isolamento estrito por `user_id` em TODAS as camadas).

### Stack sugerida

- Backend: Node.js (Fastify ou Express) + TypeScript.
- Banco: Postgres (Supabase recomendado).
- Dashboard: React + Vite + TypeScript + Tailwind + React Query.
- IA/NLP: híbrido (regex/regra para casos simples + LLM opcional como fallback).
- Infra: Docker para desenvolvimento; scripts npm para rodar local.
- Timezone: `America/Sao_Paulo`. Locale PT-BR (datas e moeda BRL).

### Entregáveis obrigatórios

1) /backend

   - Webhook WhatsApp (verify, receive, reply; idempotência por `message_id`).
   - Endpoints REST com sessão para CRUD de `transactions`, `categories`, `events`, e exportação CSV/PDF.
   - Cron jobs para lembretes e resumos (usar templates de WhatsApp aprovados).
   - Parser:
     - Regex BRL (valor), datas relativas (“hoje/ontem/amanhã”, “sex 10h”), categorias por dicionário.
     - Fallback opcional para LLM barata (ex.: GPT-4o mini), controlado por env.
   - LGPD:
     - /privacy/export → exporta apenas dados do usuário autenticado (CSV e PDF).
     - /privacy/delete → exclusão total em 2 passos + log em `audit_logs`.
2) /frontend

   - Login (OTP via WhatsApp OU e-mail OTP do Supabase — escolha uma e documente).
   - Dashboard (cards do mês), tabela de transações (filtros/edição), categorias (CRUD), agenda (CRUD), relatórios (gráficos), página de Privacidade (exportar/excluir com dupla confirmação).
   - Todas as chamadas de API devem respeitar a sessão do usuário.
3) /db

   - Migrations SQL (Postgres) para:
     - users(id uuid pk, wa_number text unique, created_at timestamptz)
     - categories(id serial pk, user_id uuid fk, name text not null, kind text check (kind in ('expense','income')) not null)
     - transactions(id uuid pk, user_id uuid fk, amount numeric(12,2) not null, currency text default 'BRL', category_id int fk, occurred_at date not null, note text, raw_message text, created_at timestamptz default now())
     - events(id uuid pk, user_id uuid fk, title text not null, starts_at timestamptz not null, remind_minutes int default 60, raw_message text, created_at timestamptz default now())
     - audit_logs(id uuid pk, user_id uuid fk, action text not null, meta jsonb, created_at timestamptz default now())
   - Ativar RLS (Row Level Security) e criar políticas por `user_id` em todas as tabelas de dados do usuário.
   - Seeds mínimos de categorias padrão ao criar usuário (alimentação, transporte…).
4) /docs

   - README.md com: setup local (Docker), .env.example, chaves WhatsApp, DB/Supabase, chave da LLM (opcional).
   - Fluxo de aprovação de templates no WhatsApp e boas práticas de opt-in.
   - Seção LGPD (minimização, consentimento, portabilidade, exclusão).
   - Diagramas simples de arquitetura e webhook.
5) Qualidade

   - ESLint + Prettier + tsconfig estrito.
   - Testes unitários (parser/validações) e integração (RLS/controle de acesso).
   - CI básico (lint + build + testes).

### Regras de segurança (NÃO NEGOCIÁVEIS)

- Toda tabela de dados do usuário tem `user_id` obrigatório (FK para `users`).
- Toda query no backend DEVE filtrar por `user_id` da sessão.
- Ativar RLS e criar políticas: SELECT/INSERT/UPDATE/DELETE apenas quando `user_id = current_user_id()`.
- Cache (se houver): namespaced por `user_id` (ex.: `saldo:USER_ID:2025-09`).
- Endpoints nunca retornam dados de outro usuário.
- Exportação e exclusão só do próprio usuário, com logs em `audit_logs`.

### Endpoints mínimos

- POST /whatsapp/webhook (mensagens) + GET /whatsapp/webhook (verify)
- GET /me
- GET/POST/PUT/DELETE /transactions
- GET/POST/PUT/DELETE /categories
- GET/POST/PUT/DELETE /events
- GET /reports/summary?from=&to=
- POST /privacy/export
- POST /privacy/delete (passo 1)
- POST /privacy/delete/confirm (passo 2)

### RLS (exemplo de abordagem)

- Backend deve fazer `SET app.user_id = '<uuid>'` por requisição.
- Políticas usam `current_setting('app.user_id')::uuid` para restringir linhas.

### UX conversacional (exemplos)

- “mercado 52,30 hoje” → cria `transaction` (Alimentação) → “Anotado! Ver saldo do mês?”
- “Dentista sexta 10h” → cria `event` → agenda lembrete 1h antes.
- “Saldo do mês” → responde resumo curto; dashboard mostra detalhado.

### Critérios de aceite

- `docker compose up` sobe DB, backend e frontend.
- Enviar mensagem simulada ao webhook cria registro no DB.
- Dashboard lista apenas dados do usuário logado; testes garantem que não há acesso cruzado.
- Export CSV/PDF funciona (escopo do próprio usuário).
- Exclusão em 2 passos apaga tudo e registra no `audit_logs`.

Gere o código completo, comentado onde necessário, com foco em clareza e segurança.
