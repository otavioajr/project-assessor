#!/bin/bash

# Teste rápido das correções
API_URL="http://localhost:3001/whatsapp/webhook"
PHONE_NUMBER="+5511999999999"

send_message() {
    local message="$1"
    local message_id="test_$(date +%s)_$RANDOM"
    
    echo "➡️  Enviando: $message"
    
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
    
    echo "✅ Enviado, aguardando resposta..."
    sleep 3
    
    # Mostrar logs recentes
    echo "📋 Logs:"
    docker compose logs --tail=10 backend | grep -E "(DEBUG|BOT RESPONSE)" | tail -5
    echo ""
}

echo "🧪 Teste rápido das correções..."
echo ""

# Teste 1: Transação simples
echo "=== TESTE 1: Transação simples ==="
send_message "mercado 15 reais"

echo "=== TESTE 2: Resposta de categoria ==="
send_message "1"

echo "🎉 Teste concluído!"
echo ""
echo "💡 Para ver todos os logs:"
echo "docker compose logs backend | tail -30"
