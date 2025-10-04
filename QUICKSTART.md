# 🚀 Guia de Início Rápido

## Setup em 5 minutos

### 1. Pré-requisitos

```bash
# Verificar versões
docker --version    # >= 20.0
docker compose version  # >= 2.0
node --version      # >= 20.0
```

### 2. Clonar e configurar

```bash
# Copiar variáveis de ambiente
cp .env.example .env

# IMPORTANTE: Editar .env com suas credenciais
nano .env
```

**Mínimo necessário no .env**:
```env
DATABASE_URL=postgres://assessor_user:assessor_pass@db:5432/assessor
JWT_SECRET=meu-secret-super-seguro-aqui
WA_VERIFY_TOKEN=meu-token-verify
WA_ACCESS_TOKEN=seu-token-whatsapp
WA_PHONE_NUMBER_ID=seu-phone-id
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_SERVICE_KEY=sua-service-key
```

### 3. Iniciar serviços

```bash
# Subir tudo com Docker
docker compose up -d

# Ver logs
docker compose logs -f

# Aguardar ~30 segundos para todos os serviços iniciarem
```

### 4. Verificar saúde dos serviços

```bash
# Backend health check
curl http://localhost:3001/health

# Deve retornar: {"status":"healthy",...}
```

### 5. Acessar aplicações

| Serviço | URL | Credenciais |
|---------|-----|-------------|
| **Frontend** | http://localhost:5173 | - |
| **Backend API** | http://localhost:3001 | - |
| **PgAdmin** | http://localhost:5050 | admin@assessor.local / admin |
| **Postgres** | localhost:5432 | assessor_user / assessor_pass |

### 6. Criar primeiro usuário (via SQL)

```bash
# Conectar ao banco
docker exec -it assessor-db psql -U assessor_user -d assessor

# Criar usuário de teste
INSERT INTO users (wa_number) VALUES ('+5511999999999') RETURNING id;

# Copiar o UUID retornado
# Exemplo: 550e8400-e29b-41d4-a716-446655440000
```

### 7. Login no dashboard

1. Acesse http://localhost:5173
2. Cole o UUID do usuário no campo de login
3. Clique em "Entrar"

**Pronto!** 🎉 Você já pode:
- Criar transações manualmente
- Agendar eventos
- Ver relatórios
- Exportar dados

## Testar via WhatsApp (Opcional)

### 1. Criar túnel público

```bash
# Instalar ngrok (se não tiver)
brew install ngrok  # macOS
# ou baixar de https://ngrok.com

# Criar túnel
ngrok http 3001
```

### 2. Configurar webhook no Meta

1. Acesse https://developers.facebook.com
2. Vá para seu app WhatsApp Business
3. Configure webhook:
   - **URL**: `https://seu-ngrok-url.ngrok.io/whatsapp/webhook`
   - **Verify Token**: mesmo do `.env` (WA_VERIFY_TOKEN)
4. Subscreva ao campo `messages`

### 3. Enviar mensagem de teste

Envie do WhatsApp:
```
mercado 52,30 hoje
```

Deve receber:
```
✅ Anotado! Alimentação: R$ 52.30
```

## Comandos Úteis

```bash
# Parar serviços
docker compose down

# Reiniciar serviços
docker compose restart

# Ver logs de um serviço específico
docker compose logs -f backend

# Executar migrations manualmente
docker compose exec backend npm run migrate

# Acessar shell do backend
docker compose exec backend sh

# Acessar PostgreSQL
docker compose exec db psql -U assessor_user -d assessor

# Limpar tudo (CUIDADO: apaga dados!)
docker compose down -v
```

## Desenvolvimento Local (sem Docker)

### Backend

```bash
cd backend
npm install
cp ../.env .env
npm run dev
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Banco

```bash
# Instalar PostgreSQL localmente
brew install postgresql@15  # macOS
# ou usar Docker apenas para o banco
docker run -d -p 5432:5432 -e POSTGRES_PASSWORD=postgres postgres:15
```

## Troubleshooting

### Porta já em uso

```bash
# Verificar o que está usando a porta
lsof -i :3001  # backend
lsof -i :5173  # frontend
lsof -i :5432  # postgres

# Matar processo
kill -9 <PID>
```

### Banco não conecta

```bash
# Verificar se container está rodando
docker compose ps

# Reiniciar banco
docker compose restart db

# Ver logs do banco
docker compose logs db
```

### Migrations não rodaram

```bash
# Executar manualmente
docker compose exec backend npm run migrate

# Ou via psql
docker compose exec db psql -U assessor_user -d assessor -f /docker-entrypoint-initdb.d/001_initial_schema.sql
```

### Frontend não carrega

```bash
# Limpar cache e reinstalar
cd frontend
rm -rf node_modules package-lock.json
npm install
npm run dev
```

## Próximos Passos

1. ✅ Testar todas as funcionalidades no dashboard
2. ✅ Configurar webhook do WhatsApp
3. ✅ Enviar mensagens de teste
4. 📝 Criar usuários reais
5. 🔐 Implementar Supabase Auth (produção)
6. 🚀 Deploy (Railway, Render, Vercel, etc.)

## Suporte

- 📖 Documentação completa: [README.md](./README.md)
- 🐛 Issues: [GitHub Issues](https://github.com/seu-usuario/assessor-financeiro/issues)
- 💬 Dúvidas: Abra uma issue com a tag `question`

---

**Dica**: Use o arquivo `progresso.md` para acompanhar o que está feito e o que falta!
