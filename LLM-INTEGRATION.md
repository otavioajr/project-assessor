# 🤖 Integração LLM - Assessor Financeiro

Esta documentação explica como a LLM (Large Language Model) foi integrada ao Assessor Financeiro como fallback inteligente para o parser de mensagens.

## 📋 Visão Geral

A LLM funciona como um **fallback** quando o parser tradicional baseado em regras não consegue identificar o tipo de mensagem. Ela é **pluggable** - você pode facilmente trocar entre diferentes provedores.

### 🎯 Objetivos da Integração

- **Não alucinação**: LLM restrita ao escopo do projeto
- **Pluggable**: Fácil troca entre provedores (Ollama, OpenAI, etc.)
- **Fallback**: Usado apenas quando parser tradicional falha
- **Confiança limitada**: LLM não pode ter mais confiança que parser tradicional

## 🏗️ Arquitetura

```
Mensagem → Parser Tradicional → [Sucesso] → Resposta
              ↓ [Falha]
           LLM Fallback → Resposta
```

### 📁 Estrutura de Arquivos

```
backend/src/nlp/llm/
├── types.ts              # Interfaces e tipos
├── base-provider.ts      # Classe abstrata base
├── ollama-provider.ts    # Implementação Ollama
├── disabled-provider.ts  # Provider desabilitado
├── factory.ts           # Factory para providers
└── index.ts             # Exports
```

## ⚙️ Configuração

### 1. Variáveis de Ambiente (.env)

```bash
# LLM Configuration
LLM_ENABLED=true
LLM_PROVIDER=ollama
LLM_BASE_URL=http://localhost:11434
LLM_MODEL=gemma2:2b
LLM_MAX_TOKENS=500
LLM_TEMPERATURE=0.1
```

### 2. Provedores Disponíveis

- **ollama**: Local, gratuito, privado
- **openai**: API externa, pago
- **disabled**: Desabilitado (fallback para unknown)

## 🚀 Setup Rápido

### 1. Usando Docker (Recomendado)

```bash
# Subir todos os serviços incluindo Ollama
docker compose up -d

# Configurar Ollama e baixar modelo
./setup-ollama.sh

# Verificar logs
docker compose logs ollama
docker compose logs backend
```

### 2. Setup Manual do Ollama

```bash
# Instalar Ollama
curl -fsSL https://ollama.ai/install.sh | sh

# Baixar modelo
ollama pull gemma2:2b

# Verificar
ollama list
```

## 📊 Como Funciona

### 1. Fluxo de Parsing

```typescript
parseMessage(text) → {
  1. Verifica queries (saldo, resumo)
  2. Extrai valores monetários
  3. Identifica eventos com data/hora
  4. 🤖 Fallback LLM se nada foi identificado
  5. Retorna 'unknown' se LLM também falhar
}
```

### 2. Prompt Estruturado

A LLM recebe um prompt cuidadosamente estruturado:

```
Você é um parser especializado para um Assessor Financeiro via WhatsApp.
ESCOPO DO PROJETO: [contexto detalhado]
CATEGORIAS DISPONÍVEIS: [lista de categorias]
INSTRUÇÕES: [regras anti-alucinação]
MENSAGEM: "[texto do usuário]"
```

### 3. Resposta Estruturada

```json
{
  "type": "transaction|query|event|unknown",
  "confidence": 0.0-0.7,
  "reasoning": "explicação",
  "data": { /* dados extraídos */ }
}
```

## 🛡️ Prevenção de Alucinação

### Medidas Implementadas

1. **Contexto Restrito**: LLM recebe apenas informações do projeto
2. **Categorias Limitadas**: Lista fechada de categorias válidas
3. **Confiança Máxima**: LLM limitada a 70% de confiança
4. **Validação Rigorosa**: Resposta validada antes de usar
5. **Fallback Seguro**: Se LLM falhar, retorna 'unknown'

### Prompt Anti-Alucinação

```
INSTRUÇÕES RIGOROSAS:
1. NUNCA invente informações que não estão na mensagem
2. APENAS identifique se a mensagem se encaixa em uma das categorias
3. Se não souber categorizar, responda type: "unknown"
4. Use apenas as categorias fornecidas
5. Confiança máxima permitida: 0.7
```

## 🔄 Trocar de Provedor

### Para OpenAI

```bash
# .env
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-your-key-here
LLM_MODEL=gpt-3.5-turbo
```

### Para Desabilitar

```bash
# .env
LLM_ENABLED=false
# ou
LLM_PROVIDER=disabled
```

## 🧪 Testes

### 1. Teste Manual via API

```bash
# Testar parser diretamente
curl -X POST http://localhost:3001/test-parser \
  -H "Content-Type: application/json" \
  -d '{"message": "comprei uma camiseta por 50 reais"}'
```

### 2. Teste via WhatsApp

Envie mensagens ambíguas que o parser tradicional não consegue processar:

- "gastei dinheiro no mercado"
- "recebi um valor hoje" 
- "preciso economizar mais"

### 3. Verificar Logs

```bash
docker compose logs backend | grep LLM
docker compose logs backend | grep Parser
```

## 📈 Monitoramento

### Métricas Importantes

- **Taxa de Fallback**: Quantas mensagens usam LLM
- **Confiança Média**: Confiança das respostas da LLM  
- **Taxa de Unknown**: Mensagens não identificadas
- **Tempo de Resposta**: Latência da LLM

### Logs Estruturados

```
[Parser] Usando LLM fallback para: "comprei algo"
[Ollama] ✅ Disponível com modelo gemma2:2b
[Parser] LLM identificou: transaction (confiança: 0.6)
```

## 🚨 Troubleshooting

### Ollama não responde

```bash
# Verificar se está rodando
curl http://localhost:11434/api/version

# Reiniciar
docker compose restart ollama

# Ver logs
docker compose logs ollama
```

### Modelo não encontrado

```bash
# Listar modelos
curl http://localhost:11434/api/tags

# Baixar modelo
./setup-ollama.sh
```

### LLM muito lenta

```bash
# Usar modelo menor
LLM_MODEL=gemma:2b

# Reduzir tokens
LLM_MAX_TOKENS=200
```

## 🔒 Privacidade e Segurança

### Ollama (Local)
- ✅ Dados ficam localmente
- ✅ Sem envio para internet
- ✅ Controle total dos dados

### OpenAI (Externa)  
- ⚠️ Dados enviados para API externa
- ⚠️ Sujeito aos termos da OpenAI
- ✅ Usar apenas com dados não sensíveis

## 📚 Próximos Passos

1. **Métricas**: Implementar coleta de métricas de performance
2. **Cache**: Cache de respostas da LLM para mensagens similares
3. **Fine-tuning**: Treinar modelo específico para o domínio
4. **A/B Testing**: Comparar performance com e sem LLM
5. **Outros Providers**: Suporte para Anthropic, Cohere, etc.
