#!/bin/bash

# Teste específico para "mês passado"
API_URL="http://localhost:3001/whatsapp/webhook"
PHONE_NUMBER="+5511999999999"

echo "🧪 Teste: 'qual meu maior gasto do mes passado?'"

curl -X POST "${API_URL}" \
    -H "Content-Type: application/json" \
    -d "{
      \"entry\": [{
        \"changes\": [{
          \"value\": {
            \"messages\": [{
              \"id\": \"test_$(date +%s)\",
              \"from\": \"${PHONE_NUMBER}\",
              \"timestamp\": \"$(date +%s)\",
              \"text\": {
                \"body\": \"qual meu maior gasto do mes passado?\"
              }
            }]
          }
        }]
      }]
    }"

echo ""
echo "✅ Mensagem enviada!"
echo ""
echo "📋 Logs da análise:"
sleep 5
docker compose logs --tail=15 backend | grep -E "(Query|LLM|BOT RESPONSE)" | tail -10
