#!/bin/bash

# Teste simples da query
API_URL="http://localhost:3001/whatsapp/webhook"
PHONE_NUMBER="+5511999999999"

echo "🧪 Teste simples: qual o meu maior gasto?"

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
                \"body\": \"qual o meu maior gasto?\"
              }
            }]
          }
        }]
      }]
    }"

echo ""
echo "✅ Mensagem enviada!"
echo ""
echo "📋 Logs do backend:"
sleep 3
docker compose logs --tail=20 backend
