#!/bin/bash

# Script para inserir dados de teste incluindo o gasto de 180 reais
API_URL="http://localhost:3001/whatsapp/webhook"
PHONE_NUMBER="+5511999999999"

send_message() {
    local message="$1"
    local message_id="test_$(date +%s)_$RANDOM"
    
    echo "➡️  Inserindo: $message"
    
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
    
    echo "✅ Enviado, aguardando..."
    sleep 3
}

echo "🧪 Inserindo dados de teste..."
echo ""

# Inserir o gasto de 180 reais da gasolina
send_message "gasolina 180 reais"
echo "Resposta para categoria:"
send_message "1"  # Assumindo que será categoria 1

echo ""
echo "🎉 Dados inseridos!"
echo ""
echo "Agora teste: 'qual meu maior gasto?'"
