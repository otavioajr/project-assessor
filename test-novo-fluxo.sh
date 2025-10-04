#!/bin/bash

# Teste do novo fluxo com categorias interativas

API_URL="http://localhost:3001/whatsapp/webhook"
PHONE_NUMBER="+5511977777777"

GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║  Teste do Novo Fluxo com Categorias       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

send_message() {
    local message="$1"
    local description="$2"
    local message_id="test_$(date +%s)_$RANDOM"
    
    echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}📝 ${description}${NC}"
    echo -e "${BLUE}➡️  \"${message}\"${NC}"
    
    local payload=$(cat <<EOF
{
  "entry": [{
    "changes": [{
      "value": {
        "messages": [{
          "id": "${message_id}",
          "from": "${PHONE_NUMBER}",
          "timestamp": "$(date +%s)",
          "text": {
            "body": "${message}"
          }
        }]
      }]
    }]
  }]
}
EOF
)
    
    curl -s -X POST "${API_URL}" -H "Content-Type: application/json" -d "${payload}" > /dev/null
    echo -e "${GREEN}✅ Enviada${NC}"
    sleep 3
}

echo -e "${YELLOW}PASSO 1: Enviar uma despesa${NC}"
send_message "uber 25" "Gasto com Uber"

echo ""
echo -e "${YELLOW}📋 O bot deve ter perguntado a categoria. Verifique os logs do backend:${NC}"
echo -e "${BLUE}docker compose logs backend | grep 'BOT RESPONSE' | tail -5${NC}"
echo ""
read -p "Pressione ENTER para responder com a categoria..."

echo ""
echo -e "${YELLOW}PASSO 2: Responder com o número da categoria${NC}"
send_message "5" "Escolher categoria 5 (Prazeres)"

echo ""
echo -e "${YELLOW}PASSO 3: Enviar outra despesa${NC}"
send_message "mercado 85,50" "Gasto no mercado"

echo ""
read -p "Pressione ENTER para responder com categoria..."

echo ""
echo -e "${YELLOW}PASSO 4: Responder pelo nome da categoria${NC}"
send_message "custos fixos" "Escolher 'Custos Fixos' pelo nome"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║           ✅ Teste Concluído!              ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Para ver todas as respostas do bot:${NC}"
echo "  docker compose logs backend | grep 'BOT RESPONSE' -A2"
echo ""
echo -e "${BLUE}📋 Para consultar as transações criadas:${NC}"
echo "  1. Obtenha o UUID: docker compose exec db psql -U assessor_user -d assessor -c \"SELECT id FROM users WHERE wa_number = '${PHONE_NUMBER}';\""
echo "  2. Consulte: curl -H 'x-user-id: UUID_AQUI' http://localhost:3001/transactions | jq '.'"
echo ""
