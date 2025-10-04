# 🧪 Guia de Testes - Simulador WhatsApp

## ✅ Sistema Funcionando!

O sistema está processando mensagens como se fossem do WhatsApp, mas **sem usar a API real**.

---

## 🚀 Como Testar

### Opção 1: Teste Automatizado (Recomendado)

```bash
# Executa bateria completa de testes
./test-whatsapp-auto.sh
```

### Opção 2: Teste Interativo

```bash
# Modo interativo - digite suas próprias mensagens
./test-whatsapp.sh
```

### Opção 3: Teste Manual (curl)

```bash
# Estrutura básica
curl -X POST http://localhost:3001/whatsapp/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "entry": [{
      "changes": [{
        "value": {
          "messages": [{
            "id": "msg_123",
            "from": "+5511999999999",
            "timestamp": "1234567890",
            "text": {
              "body": "mercado 52,30 hoje"
            }
          }]
        }
      }]
    }]
  }'
```

---

## 📝 Exemplos de Mensagens

### 💰 Transações (Despesas)

✅ **Reconhecidas corretamente:**
- `mercado 52,30 hoje` → Alimentação: R$ 52,30
- `uber 25` → Transporte: R$ 25,00  
- `farmácia 45,90 ontem` → Saúde: R$ 45,90
- `gasolina 150 05/10` → Transporte: R$ 150,00 (data 05/10)

### 💵 Transações (Receitas)

✅ **Reconhecidas corretamente:**
- `recebido salário 3500` → Outros: R$ 3500,00
- `freelance 1200` → Outros: R$ 1200,00
- `deposito 500` → Outros: R$ 500,00

### 📅 Eventos/Compromissos

⚠️ **OBSERVAÇÃO:** O parser atual tem prioridade para transações. Se a mensagem contém um número, pode ser interpretada como valor.

**Para eventos, use frases sem valores numéricos:**
- `dentista amanhã` → Funciona
- `reunião segunda` → Funciona  
- `dentista sexta 10h` → ❌ Interpretado como transação (10 = R$ 10,00)

**Melhorias futuras:** Ajustar parser para priorizar eventos quando houver palavras-chave de tempo.

### 📊 Consultas

✅ **Funcionam perfeitamente:**
- `saldo` → Retorna saldo do mês
- `resumo` → Retorna resumo do mês
- `total` → Retorna resumo do mês

### ❌ Mensagens Não Reconhecidas

- `oi tudo bem?` → Retorna ajuda
- `blablabla` → Retorna ajuda

---

## 🔍 Como Ver as Respostas do Bot

### 1. Logs em Tempo Real

```bash
docker compose logs -f backend | grep "BOT RESPONSE"
```

### 2. Ver Últimas Respostas

```bash
docker compose logs backend | grep -A2 "BOT RESPONSE" | tail -20
```

---

## 📊 Consultar Dados Criados

### 1. Obter UUID do Usuário

```bash
docker compose exec -T db psql -U assessor_user -d assessor \
  -c "SELECT id, wa_number FROM users WHERE wa_number = '+5511988888888';"
```

Resultado:
```
                  id                  |   wa_number    
--------------------------------------+----------------
 660e8400-e29b-41d4-a716-446655440001 | +5511988888888
```

### 2. Listar Transações via API

```bash
curl -s -H "x-user-id: 660e8400-e29b-41d4-a716-446655440001" \
  http://localhost:3001/transactions | jq '.'
```

### 3. Listar Eventos via API

```bash
curl -s -H "x-user-id: 660e8400-e29b-41d4-a716-446655440001" \
  http://localhost:3001/events | jq '.'
```

### 4. Ver Resumo Mensal

```bash
curl -s -H "x-user-id: 660e8400-e29b-41d4-a716-446655440001" \
  http://localhost:3001/reports/summary?from=2025-10-01&to=2025-10-31 | jq '.'
```

---

## 🎭 Fluxo de uma Mensagem

1. **Usuário envia mensagem** → Script simula webhook do WhatsApp
2. **Backend recebe** → Rota `/whatsapp/webhook`
3. **Cria/busca usuário** → Pelo número de telefone
4. **Parser analisa** → Identifica tipo (transação/evento/consulta)
5. **Processa** → Salva no banco ou busca dados
6. **Responde** → Em modo dev, loga no console (em prod, enviaria via API)

---

## 🔧 Categorias Reconhecidas

O parser reconhece automaticamente estas palavras-chave:

### Alimentação
`mercado`, `supermercado`, `feira`, `restaurante`, `lanche`, `ifood`, `comida`, `padaria`

### Transporte  
`uber`, `taxi`, `gasolina`, `combustível`, `ônibus`, `metrô`, `estacionamento`

### Saúde
`farmácia`, `remédio`, `médico`, `dentista`, `consulta`, `hospital`

### Moradia
`aluguel`, `condomínio`, `luz`, `água`, `internet`, `gás`

### Lazer
`cinema`, `show`, `festa`, `viagem`, `netflix`, `spotify`

---

## 🎯 Resultados dos Testes Automatizados

Quando você executa `./test-whatsapp-auto.sh`, o sistema:

✅ Cria usuário automaticamente (+5511988888888)  
✅ Processa 5 transações  
✅ Tenta criar 2 eventos (podem virar transações por limitação do parser)  
✅ Responde a 2 consultas  
✅ Lida com 1 mensagem não reconhecida  

**Total:** 10 mensagens processadas

---

## 🚀 Próximos Passos

Para ativar o WhatsApp de verdade:

1. **Obter credenciais** da Meta (Facebook Developers)
2. **Atualizar `.env`** com tokens reais:
   ```env
   WA_ACCESS_TOKEN=EAAxxxxx...
   WA_PHONE_NUMBER_ID=123456...
   WA_VERIFY_TOKEN=seu-token-secreto
   ```
3. **Reiniciar backend:** `docker compose restart backend`
4. **Configurar webhook** no Meta apontando para seu servidor
5. **Pronto!** O bot responderá mensagens reais

---

## 💡 Dicas

- **Ver todos os logs:** `docker compose logs -f`
- **Limpar tudo e recomeçar:** `docker compose down -v && docker compose up -d`
- **Acessar banco:** `make db`
- **Testar parser diretamente:** Modifique `backend/src/nlp/parser.ts`

---

## 🐛 Problemas Conhecidos

1. **Parser prioriza transações** - Números são interpretados como valores
2. **Eventos com hora numérica** - "10h" vira R$ 10,00
3. **Receitas** - Categorias não específicas, sempre "Outros"

**Solução:** Melhorar regras do parser ou integrar LLM (GPT).
