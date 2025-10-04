#!/bin/bash

# Teste específico para queries que devem acionar a LLM
API_URL="http://localhost:3001/whatsapp/webhook"
PHONE_NUMBER="+5511999999999"

send_message() {
    local message="$1"
    local message_id="test_$(date +%s)_$RANDOM"
    
    echo "➡️  Testando: $message"
    
    curl -s -X POST "${API_URL}" \
        -H "Content-Type: application/json" \
        -d "{
          \"entry\": [{
            \"changes\": [{
              \"value\": {
                \"messages\": [{
                  \"id\": \"${message_id}\",
                  \"from\": \"${PHONE_NUMBER}\",
                  \"timestamp\": \"$(date +%s)\",
                  \"text\": {
                    \"body\": \"${message}\"
                  }
                }]
              }
            }]
          }]
        }" > /dev/null
    
    echo "✅ Enviado, aguardando análise..."
    sleep 5
    
    # Mostrar logs específicos de parsing
    echo "🔍 Análise do Parser:"
    docker compose logs --tail=20 backend | grep -E "(DEBUG|Parser|LLM)" | tail -8 | while read -r line; do
        if echo "$line" | grep -q "LLM fallback"; then
            echo "  🤖 $line"
        elif echo "$line" | grep -q "LLM identificou"; then
            echo "  ✅ $line"
        elif echo "$line" | grep -q "DEBUG.*Parsed"; then
            echo "  📝 $line"
        else
            echo "  $line"
        fi
    done
    echo ""
}

echo "🧪 Testando queries específicas que devem acionar LLM..."
echo ""

# Queries que devem ser identificadas pelo parser tradicional
echo "=== PARSER TRADICIONAL (deve identificar diretamente) ==="
send_message "saldo"
send_message "quanto gastei hoje?"

# Queries que devem acionar a LLM
echo "=== LLM FALLBACK (deve acionar IA) ==="
send_message "qual meu maior gasto?"
send_message "onde gastei mais dinheiro?"
send_message "como está minha situação financeira?"

echo "🎉 Teste concluído!"
echo ""
echo "💡 Para ver logs completos:"
echo "docker compose logs backend | grep -E '(Parser|LLM)' | tail -20"
