# Assessor Financeiro + Assistente de Agenda via WhatsApp

Sistema completo de gestão financeira e agenda pessoal com interface WhatsApp e dashboard web, com isolamento multiusuário e conformidade LGPD.

## 🚀 Stack Tecnológica

- **Backend**: Node.js + TypeScript + Fastify
- **Banco de Dados**: PostgreSQL 15 com RLS (Supabase recomendado)
- **Frontend**: React 18 + Vite + TypeScript + TailwindCSS
- **WhatsApp**: Business API (Meta)
- **Parser**: Regex + NLP híbrido + LLM fallback (Ollama)
- **LLM**: Ollama local ou OpenAI (pluggable)
- **Infra**: Docker Compose

## 📋 Funcionalidades

### Via WhatsApp
- ✅ Registrar gastos e receitas com linguagem natural
- ✅ Agendar compromissos com lembretes automáticos
- ✅ Consultar saldo e resumos financeiros
- ✅ Categorização automática de transações

### Dashboard Web
- ✅ Visualização de transações e eventos
- ✅ Gráficos e relatórios financeiros
- ✅ CRUD completo de categorias
- ✅ Exportação de dados (CSV/PDF)
- ✅ Exclusão de conta em 2 passos

## 🔒 Segurança e LGPD

- **RLS (Row Level Security)**: Isolamento total por `user_id`
- **Auditoria**: Logs de ações sensíveis
- **Portabilidade**: Export CSV/PDF
- **Esquecimento**: Exclusão completa em 2 passos
- **Idempotência**: Prevenção de mensagens duplicadas

## 🛠️ Setup Local

### Pré-requisitos
- Docker & Docker Compose
- Node.js 20+
- Conta WhatsApp Business API (Meta)

### 1. Clonar e configurar

```bash
# Copiar .env de exemplo
cp .env.example .env

# Editar variáveis de ambiente
nano .env
```

### 2. Configurar variáveis essenciais

```env
# Backend
DATABASE_URL=postgres://assessor_user:assessor_pass@localhost:5432/assessor
JWT_SECRET=sua-chave-secreta-aqui

# WhatsApp Business API
WA_VERIFY_TOKEN=seu-token-de-verificacao
WA_ACCESS_TOKEN=seu-token-de-acesso
WA_PHONE_NUMBER_ID=seu-phone-number-id

# Supabase (para autenticação)
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key

# LLM (opcional - para parser inteligente)
LLM_ENABLED=true
LLM_PROVIDER=ollama
LLM_MODEL=gemma2:2b
```

### 3. Iniciar serviços

```bash
# Subir todos os serviços
docker compose up -d

# Ver logs
docker compose logs -f
```

### 4. Acessar aplicações

- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:3001
- **PgAdmin**: http://localhost:5050 (admin@assessor.local / admin)
- **Ollama**: http://localhost:11434 (se habilitado)
- **Banco**: localhost:5432

### 4. Configurar LLM (Opcional)

```bash
# Configurar Ollama e baixar modelo Gemma
./setup-ollama.sh

# Testar integração LLM
./test-llm.sh
```

## 📦 Desenvolvimento Local (sem Docker)

### Backend

```bash
cd backend
npm install
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

## 🔌 Configurar Webhook WhatsApp

1. Acesse o [Meta for Developers](https://developers.facebook.com)
2. Configure o webhook:
   - URL: `https://seu-dominio.com/whatsapp/webhook`
   - Verify Token: mesmo do `.env` (`WA_VERIFY_TOKEN`)
3. Subscreva aos eventos: `messages`

## 📊 Estrutura do Banco

```sql
users          # Usuários (identificados por wa_number)
categories     # Categorias de transações (por usuário)
transactions   # Transações financeiras
events         # Eventos de agenda
audit_logs     # Logs de auditoria (LGPD)
```

**RLS Ativo**: Todas as queries filtram automaticamente por `user_id` da sessão.

## 🧪 Testes

```bash
# Backend
cd backend
npm test

# Testes de segurança (RLS)
npm run test:security
```

## 📝 Exemplos de Uso (WhatsApp)

```
"mercado 52,30 hoje"
→ Cria transação de R$ 52,30 na categoria Alimentação

"dentista sexta 10h"
→ Agenda compromisso para sexta-feira às 10h

"saldo do mês"
→ Retorna resumo financeiro do mês atual
```

## 🏗️ Arquitetura

```
WhatsApp → Webhook → Parser → DB (RLS) → Resposta
                                ↓
                            Dashboard (React)
                                ↓
                          API REST (Fastify)
```

## 📄 Endpoints API

- `GET/POST /whatsapp/webhook` - Webhook WhatsApp
- `GET /auth/me` - Usuário autenticado
- `GET/POST/PUT/DELETE /transactions` - Transações
- `GET/POST/PUT/DELETE /categories` - Categorias
- `GET/POST/PUT/DELETE /events` - Eventos
- `GET /reports/summary` - Relatórios
- `POST /privacy/export` - Exportar dados
- `POST /privacy/delete` - Excluir conta (2 passos)

## 🔐 Autenticação

**Desenvolvimento**: Header `x-user-id` (simplificado)

**Produção**: Substituir por Supabase Auth com OTP

## ⚙️ Jobs Automáticos

- **Lembretes**: A cada 5 minutos (verifica eventos próximos)
- **Resumo Diário**: 20h (horário de Brasília)

## 🌍 Timezone e Locale

- **Timezone**: `America/Sao_Paulo`
- **Moeda**: BRL (R$)
- **Data**: dd/MM/yyyy

## 📚 Documentação Completa

| Documento | Descrição |
| **[QUICKSTART.md](./QUICKSTART.md)** | Guia de início rápido (5 minutos) |
| **[ARQUITETURA.md](./ARQUITETURA.md)** | Diagramas e detalhes técnicos |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | Como contribuir com o projeto |
| **[progresso.md](./progresso.md)** | Histórico completo de desenvolvimento |
| **[PROJETO-CONCLUIDO.md](./PROJETO-CONCLUIDO.md)** | Sumário executivo |
| **[specs.md](./specs.md)** | Especificações técnicas originais |
| **[main-prompt.md](./main-prompt.md)** | Requisitos do projeto |
| **[CONTRIBUINDO.md](./CONTRIBUINDO.md)** | Como contribuir com o projeto |

Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/nova-funcionalidade`)
3. Commit suas mudanças (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Push para a branch (`git push origin feature/nova-funcionalidade`)

## 📄 Licença

MIT License - veja [LICENSE](LICENSE) para detalhes.

## ⚠️ Notas de Produção

- [ ] Substituir autenticação simplificada por Supabase Auth
- [ ] Configurar HTTPS com certificado válido
- [ ] Implementar rate limiting por usuário
- [ ] Adicionar monitoramento (Sentry, Datadog)
- [ ] Configurar backups automáticos do banco
- [ ] Implementar cache com Redis
- [ ] Adicionar testes E2E (Playwright)
- [ ] Configurar CI/CD (GitHub Actions)

## 📞 Suporte

Para dúvidas ou problemas, abra uma [issue](https://github.com/seu-usuario/assessor-financeiro/issues).
