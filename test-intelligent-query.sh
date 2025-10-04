#!/bin/bash

# Teste da query inteligente
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
    
    echo "✅ Enviado, aguardando análise LLM..."
    sleep 8
    
    # Mostrar logs específicos
    echo "🔍 Logs da análise:"
    docker compose logs --tail=30 backend | grep -E "(Query|LLM|DEBUG)" | tail -10
    
    echo ""
    echo "🤖 Resposta do bot:"
    docker compose logs --tail=20 backend | grep "BOT RESPONSE" -A10 | tail -10 | grep -v "BOT RESPONSE"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

echo "🧪 Testando Query Inteligente com LLM..."
echo ""

send_message "qual o meu maior gasto?"

echo "🎉 Teste concluído!"
