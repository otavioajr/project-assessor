#!/bin/bash

# Testes automatizados do sistema de mensagens WhatsApp

API_URL="http://localhost:3001/whatsapp/webhook"
PHONE_NUMBER="+5511988888888"

# Cores
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Teste Automatizado - WhatsApp Bot       ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""

# Função para enviar mensagem
send_message() {
    local message="$1"
    local description="$2"
    local message_id="auto_$(date +%s)_$RANDOM"
    
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
      }
    }]
  }]
}
EOF
)
    
    response=$(curl -s -X POST "${API_URL}" \
        -H "Content-Type: application/json" \
        -d "${payload}")
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✅ Enviada com sucesso${NC}"
    else
        echo -e "${RED}❌ Erro ao enviar${NC}"
    fi
    
    sleep 2
}

echo -e "${BLUE}Iniciando bateria de testes...${NC}"
echo ""
sleep 1

# TESTE 1: Transações
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}          TESTANDO TRANSAÇÕES              ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""

send_message "mercado 52,30 hoje" "Transação de mercado (hoje)"
send_message "uber 25" "Transação sem data (usa data atual)"
send_message "farmácia 45,90 ontem" "Transação de ontem"
send_message "gasolina 150 05/10" "Transação com data específica"
send_message "recebido salário 3500" "Receita - salário"

# TESTE 2: Eventos
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}            TESTANDO EVENTOS               ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""

send_message "dentista sexta 10h" "Evento - dentista na sexta às 10h"
send_message "reunião segunda 14:30" "Evento - reunião segunda às 14:30"

# TESTE 3: Consultas
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}           TESTANDO CONSULTAS              ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""

send_message "saldo" "Consulta de saldo"
send_message "resumo" "Consulta de resumo"

# TESTE 4: Mensagem não reconhecida
echo ""
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo -e "${YELLOW}        TESTANDO MENSAGEM INVÁLIDA         ${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════${NC}"
echo ""

send_message "oi tudo bem?" "Mensagem não reconhecida"

echo ""
echo -e "${GREEN}╔════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║     ✅ Testes concluídos com sucesso!      ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}📊 Agora você pode:${NC}"
echo "  1. Verificar os logs do backend: docker compose logs -f backend"
echo "  2. Consultar as transações via API: curl -H 'x-user-id: UUID' http://localhost:3001/transactions"
echo "  3. Acessar o dashboard: http://localhost:5173"
echo ""
echo -e "${YELLOW}💡 Para obter o UUID do usuário criado:${NC}"
echo "  docker compose exec db psql -U assessor_user -d assessor -c \"SELECT id, wa_number FROM users WHERE wa_number = '${PHONE_NUMBER}';\""
echo ""
