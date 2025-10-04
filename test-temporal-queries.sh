#!/bin/bash

# Teste das consultas temporais inteligentes
API_URL="http://localhost:3001/whatsapp/webhook"
PHONE_NUMBER="+5511999999999"

send_message() {
    local message="$1"
    local expected="$2"
    local message_id="test_$(date +%s)_$RANDOM"
    
    echo "➡️  Testando: \"$message\""
    echo "   Esperado: $expected"
    
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
    
    # Mostrar logs da análise
    echo "🔍 Análise LLM:"
    docker compose logs --tail=10 backend | grep -E "(Query|LLM)" | tail -3
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
}

echo "🧪 Testando Consultas Temporais Inteligentes..."
echo ""

# Testes de períodos temporais
send_message "qual meu maior gasto?" "maior_gasto|todos_tempos"
send_message "qual meu maior gasto do mês passado?" "maior_gasto|mes_passado"
send_message "menor gasto desta semana" "menor_gasto|semana_atual"

echo "🎉 Testes concluídos!"
