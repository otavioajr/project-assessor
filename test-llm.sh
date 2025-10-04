#!/bin/bash

# Script para testar a integração LLM
# Uso: ./test-llm.sh

set -e

echo "🧪 Testando integração LLM do Assessor Financeiro..."
echo ""

API_URL="http://localhost:3001"

# Verificar se backend está rodando
if ! curl -s $API_URL/health > /dev/null; then
    echo "❌ Backend não está respondendo em $API_URL"
    echo "   Execute: docker compose up -d"
    exit 1
fi

echo "✅ Backend detectado em $API_URL"

# Verificar se Ollama está configurado
if curl -s http://localhost:11434/api/version > /dev/null; then
    echo "✅ Ollama detectado em http://localhost:11434"
    
    # Verificar modelo
    MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 || echo "")
    if echo "$MODELS" | grep -q "gemma"; then
        echo "✅ Modelo Gemma disponível"
    else
        echo "⚠️  Modelo Gemma não encontrado. Execute: ./setup-ollama.sh"
    fi
else
    echo "⚠️  Ollama não detectado (LLM pode estar desabilitada)"
fi

echo ""
echo "🎯 Testando casos de uso..."

# Função para testar mensagem
test_message() {
    local message="$1"
    local description="$2"
    
    echo ""
    echo "📝 Testando: $description"
    echo "   Mensagem: \"$message\""
    
    # Simular parsing (você precisará implementar endpoint /test-parser)
    # Por enquanto, teste manual via logs
    echo "   → Envie esta mensagem via WhatsApp para testar"
}

# Casos de teste - Parser tradicional deve pegar
echo "=== Casos que o PARSER TRADICIONAL deve identificar ==="
test_message "gastei 30 reais no almoço" "Transação com valor e categoria clara"
test_message "recebi 1000 salário hoje" "Receita identificável"
test_message "quanto gastei hoje?" "Query de saldo"
test_message "reunião sexta 10h" "Evento com data e hora"

# Casos de teste - LLM deve ser acionada
echo ""
echo "=== Casos que devem acionar a LLM FALLBACK ==="
test_message "comprei umas coisas no mercado" "Transação sem valor explícito"
test_message "gastei um dinheiro hoje" "Valor vago"
test_message "preciso economizar mais" "Intenção financeira"
test_message "meu orçamento está apertado" "Situação financeira"
test_message "vou guardar dinheiro para viagem" "Objetivo de poupança"

# Casos de teste - Devem retornar unknown
echo ""
echo "=== Casos que devem retornar UNKNOWN ==="
test_message "oi, como vai?" "Cumprimento geral"
test_message "que horas são?" "Pergunta não relacionada"
test_message "como está o tempo?" "Pergunta fora do escopo"

echo ""
echo "🔍 Como verificar os resultados:"
echo ""
echo "1. Envie as mensagens via WhatsApp"
echo "2. Observe os logs do backend:"
echo "   docker compose logs -f backend | grep -E '(Parser|LLM)'"
echo ""
echo "3. Procure por estas mensagens nos logs:"
echo "   [Parser] Usando LLM fallback para: ..."
echo "   [Ollama] ✅ Disponível com modelo ..."
echo "   [Parser] LLM identificou: ..."
echo ""
echo "4. Verifique no dashboard as transações criadas"
echo ""
echo "📊 Métricas esperadas:"
echo "   - Parser tradicional: ~60-70% das mensagens"
echo "   - LLM fallback: ~20-30% das mensagens" 
echo "   - Unknown: ~5-10% das mensagens"
echo ""
echo "🎉 Teste concluído!"
echo ""
echo "💡 Dicas para ajustar:"
echo "   - Se LLM muito acionada: melhore parser tradicional"
echo "   - Se muitos unknown: ajuste prompt da LLM"
echo "   - Se LLM lenta: use modelo menor (gemma:2b → gemma:1b)"
