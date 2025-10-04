#!/bin/bash

# Script para simular mensagens do WhatsApp localmente
# Usa o webhook do backend para processar mensagens
# NOVO FLUXO: Sistema pergunta a categoria antes de salvar

API_URL="http://localhost:3001/whatsapp/webhook"
PHONE_NUMBER="+5511999999999"  # Número fictício para testes

# Cores para o terminal
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

echo -e "${BLUE}╔════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║   Simulador de WhatsApp - Teste Local     ║${NC}"
echo -e "${BLUE}║        NOVO FLUXO COM CATEGORIAS           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${YELLOW}Número de teste: ${PHONE_NUMBER}${NC}"
echo ""

# Função para enviar mensagem
send_message() {
    local message="$1"
    local message_id="test_$(date +%s)_$RANDOM"
    
    echo -e "${GREEN}➡️  Você: ${message}${NC}"
    
    # Payload no formato do WhatsApp
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
    
    # Enviar para o webhook
    response=$(curl -s -X POST "${API_URL}" \
        -H "Content-Type: application/json" \
        -d "${payload}")
    
    echo -e "${BLUE}✅ Mensagem enviada${NC}"
    
    # Aguardar resposta do bot
    sleep 2
    
    # Mostrar informações de parsing
    echo -e "${CYAN}🔍 Análise do Parser:${NC}"
    recent_logs=$(docker compose logs --tail=30 backend 2>/dev/null | grep -E "(Parser|LLM|parseMessage)" | tail -5)
    if [ -n "$recent_logs" ]; then
        echo "$recent_logs" | sed 's/assessor-backend  | //g' | while read -r line; do
            if echo "$line" | grep -q "LLM fallback"; then
                echo -e "  ${YELLOW}🤖 $line${NC}"
            elif echo "$line" | grep -q "LLM identificou"; then
                echo -e "  ${GREEN}✅ $line${NC}"
            elif echo "$line" | grep -q "Parser"; then
                echo -e "  ${CYAN}🔧 $line${NC}"
            else
                echo -e "  $line"
            fi
        done
    else
        echo -e "  ${MAGENTA}(Sem logs de parsing encontrados)${NC}"
    fi
    
    # Mostrar resposta do bot
    echo -e "${CYAN}🤖 Resposta do Bot:${NC}"
    bot_response=$(docker compose logs --tail=20 backend 2>/dev/null | grep "BOT RESPONSE" -A5 | tail -6 | grep -v "BOT RESPONSE" | sed 's/assessor-backend  | //g')
    if [ -n "$bot_response" ]; then
        echo "$bot_response" | while read -r line; do
            echo -e "  ${YELLOW}$line${NC}"
        done
    else
        echo -e "  ${MAGENTA}(Verifique os logs: docker compose logs backend | tail -20)${NC}"
    fi
    echo ""
}

# Menu interativo
echo -e "${MAGENTA}╔════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║           COMO FUNCIONA O FLUXO            ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}1. Você envia um gasto/receita:${NC}"
echo -e "   ${GREEN}Exemplo: uber 25${NC}"
echo ""
echo -e "${CYAN}2. Bot registra e pergunta a categoria:${NC}"
echo -e "   ${YELLOW}💰 Registrei: R\$ 25.00${NC}"
echo -e "   ${YELLOW}📂 Em qual categoria?${NC}"
echo -e "   ${YELLOW}1. Aumentar Renda/Empreender${NC}"
echo -e "   ${YELLOW}2. Conforto${NC}"
echo -e "   ${YELLOW}...${NC}"
echo ""
echo -e "${CYAN}3. Você responde com o número ou nome:${NC}"
echo -e "   ${GREEN}Exemplo: 5${NC} ou ${GREEN}prazeres${NC}"
echo ""
echo -e "${CYAN}4. Bot confirma:${NC}"
echo -e "   ${YELLOW}✅ Anotado! Prazeres: R\$ 25.00${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo -e "${MAGENTA}TESTES POR CATEGORIA:${NC}"
echo ""
echo -e "${CYAN}🔧 1. PARSER TRADICIONAL (deve identificar diretamente):${NC}"
echo "  - mercado 52,30        ${GREEN}# Valor + categoria${NC}"
echo "  - uber 25              ${GREEN}# Valor claro${NC}"
echo "  - recebi salário 3000   ${GREEN}# Receita óbvia${NC}"
echo "  - saldo                ${GREEN}# Query simples${NC}"
echo "  - reunião sexta 10h    ${GREEN}# Evento com data/hora${NC}"
echo ""
echo -e "${CYAN}🤖 2. LLM FALLBACK (deve acionar IA):${NC}"
echo "  - comprei umas coisas no mercado      ${YELLOW}# Sem valor explícito${NC}"
echo "  - gastei um dinheiro hoje            ${YELLOW}# Valor vago${NC}"
echo "  - preciso economizar mais            ${YELLOW}# Intenção financeira${NC}"
echo "  - meu orçamento está apertado        ${YELLOW}# Situação financeira${NC}"
echo "  - vou guardar dinheiro para viagem   ${YELLOW}# Objetivo de poupança${NC}"
echo ""
echo -e "${CYAN}❓ 3. UNKNOWN (deve retornar desconhecido):${NC}"
echo "  - oi, como vai?        ${MAGENTA}# Cumprimento${NC}"
echo "  - que horas são?       ${MAGENTA}# Pergunta não relacionada${NC}"
echo "  - como está o tempo?   ${MAGENTA}# Fora do escopo${NC}"
echo ""
echo -e "${CYAN}📂 4. RESPONDER CATEGORIA:${NC}"
echo "  - 1, 2, 3...           ${GREEN}# Número da categoria${NC}"
echo "  - custos fixos, prazeres... ${GREEN}# Nome da categoria${NC}"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""

# Função para teste automatizado da LLM
test_llm_cases() {
    echo -e "${BLUE}🧪 Iniciando testes automáticos da LLM...${NC}"
    echo ""
    
    # Verificar se LLM está habilitada
    echo -e "${CYAN}📋 Verificando configuração LLM...${NC}"
    if curl -s http://localhost:11434/api/version > /dev/null; then
        echo -e "${GREEN}✅ Ollama detectado em http://localhost:11434${NC}"
    else
        echo -e "${YELLOW}⚠️  Ollama não detectado (LLM pode estar desabilitada)${NC}"
    fi
    echo ""
    
    # Abrir logs em segundo plano
    echo -e "${CYAN}📊 Abrindo logs para monitoramento...${NC}"
    echo -e "${YELLOW}💡 Em outro terminal execute: docker compose logs -f backend | grep -E '(Parser|LLM|BOT)'${NC}"
    echo ""
    
    # Casos de teste organizados
    declare -a parser_cases=(
        "mercado 52,30:Valor + categoria"
        "uber 25:Valor claro"
        "recebi salário 3000:Receita óbvia" 
        "saldo:Query simples"
        "reunião sexta 10h:Evento com data/hora"
    )
    
    declare -a llm_cases=(
        "comprei umas coisas no mercado:Sem valor explícito"
        "gastei um dinheiro hoje:Valor vago"
        "preciso economizar mais:Intenção financeira"
        "meu orçamento está apertado:Situação financeira"
        "vou guardar dinheiro para viagem:Objetivo de poupança"
    )
    
    declare -a unknown_cases=(
        "oi, como vai?:Cumprimento"
        "que horas são?:Pergunta não relacionada"
        "como está o tempo?:Fora do escopo"
    )
    
    # Testar casos do parser tradicional
    echo -e "${GREEN}=== 1. TESTANDO PARSER TRADICIONAL ===${NC}"
    for case in "${parser_cases[@]}"; do
        IFS=':' read -r message description <<< "$case"
        echo -e "${CYAN}📝 ${description}: \"${message}\"${NC}"
        send_message "$message"
        echo "   ${GREEN}→ Deve ser identificado pelo parser tradicional${NC}"
        sleep 3
        echo ""
    done
    
    # Testar casos da LLM
    echo -e "${YELLOW}=== 2. TESTANDO LLM FALLBACK ===${NC}"
    for case in "${llm_cases[@]}"; do
        IFS=':' read -r message description <<< "$case"
        echo -e "${CYAN}📝 ${description}: \"${message}\"${NC}"
        send_message "$message"
        echo "   ${YELLOW}→ Deve acionar a LLM como fallback${NC}"
        sleep 3
        echo ""
    done
    
    # Testar casos unknown
    echo -e "${MAGENTA}=== 3. TESTANDO CASOS UNKNOWN ===${NC}"
    for case in "${unknown_cases[@]}"; do
        IFS=':' read -r message description <<< "$case"
        echo -e "${CYAN}📝 ${description}: \"${message}\"${NC}"
        send_message "$message"
        echo "   ${MAGENTA}→ Deve retornar como unknown${NC}"
        sleep 3
        echo ""
    done
    
    echo -e "${BLUE}🎉 Testes automáticos concluídos!${NC}"
    echo ""
    
    # Mostrar estatísticas dos testes
    echo -e "${CYAN}📊 RESUMO DOS TESTES:${NC}"
    echo ""
    
    # Contar diferentes tipos de parsing nos logs recentes
    all_logs=$(docker compose logs --since=5m backend 2>/dev/null | grep -E "(Parser|LLM)")
    
    parser_count=$(echo "$all_logs" | grep -c "Parser.*confidence" 2>/dev/null || echo "0")
    llm_count=$(echo "$all_logs" | grep -c "LLM fallback" 2>/dev/null || echo "0") 
    llm_success=$(echo "$all_logs" | grep -c "LLM identificou" 2>/dev/null || echo "0")
    unknown_count=$(echo "$all_logs" | grep -c "unknown.*confidence.*0" 2>/dev/null || echo "0")
    
    echo -e "${GREEN}🔧 Parser Tradicional: ${parser_count} mensagens${NC}"
    echo -e "${YELLOW}🤖 LLM Fallback: ${llm_count} acionamentos${NC}"
    echo -e "${GREEN}✅ LLM Sucessos: ${llm_success} identificações${NC}"
    echo -e "${MAGENTA}❓ Unknown: ${unknown_count} não identificadas${NC}"
    echo ""
    
    # Mostrar eficiência
    total_tests=$((parser_count + llm_count + unknown_count))
    if [ "$total_tests" -gt 0 ]; then
        parser_pct=$((parser_count * 100 / total_tests))
        llm_pct=$((llm_count * 100 / total_tests))
        unknown_pct=$((unknown_count * 100 / total_tests))
        
        echo -e "${CYAN}📈 EFICIÊNCIA:${NC}"
        echo -e "  Parser: ${parser_pct}% | LLM: ${llm_pct}% | Unknown: ${unknown_pct}%"
        echo ""
        
        if [ "$parser_pct" -ge 60 ] && [ "$llm_pct" -le 35 ] && [ "$unknown_pct" -le 10 ]; then
            echo -e "${GREEN}✅ Distribuição ideal! Sistema funcionando bem.${NC}"
        elif [ "$llm_pct" -gt 50 ]; then
            echo -e "${YELLOW}⚠️  Muitas mensagens na LLM - considere melhorar parser tradicional.${NC}"
        elif [ "$unknown_pct" -gt 20 ]; then
            echo -e "${YELLOW}⚠️  Muitas mensagens unknown - ajuste prompts da LLM.${NC}"
        else
            echo -e "${BLUE}ℹ️  Sistema funcionando normalmente.${NC}"
        fi
        echo ""
    fi
    
    echo -e "${CYAN}🔍 Para análise detalhada:${NC}"
    echo "1. Logs completos: docker compose logs backend | grep -E '(Parser|LLM)' | tail -50"
    echo "2. Apenas LLM: docker compose logs backend | grep 'LLM' | tail -20" 
    echo "3. Transações criadas: curl -H 'x-user-id: UUID' http://localhost:3001/transactions"
    echo ""
}

# Menu de opções
echo -e "${MAGENTA}╔════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║              ESCOLHA O MODO                ║${NC}"
echo -e "${MAGENTA}╚════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${CYAN}1.${NC} Teste ${YELLOW}AUTOMÁTICO${NC} da LLM (recomendado)"
echo -e "${CYAN}2.${NC} Teste ${GREEN}INTERATIVO${NC} (digite mensagens)"
echo -e "${CYAN}3.${NC} ${BLUE}MONITORAMENTO${NC} em tempo real (apenas logs)"
echo ""
echo -ne "${YELLOW}Escolha uma opção (1, 2 ou 3): ${NC}"
read -r choice

if [ "$choice" = "1" ]; then
    test_llm_cases
    echo ""
    echo -ne "${YELLOW}Deseja continuar no modo interativo? (s/N): ${NC}"
    read -r continue_interactive
    if [ "$continue_interactive" != "s" ] && [ "$continue_interactive" != "S" ]; then
        echo -e "${BLUE}👋 Teste concluído!${NC}"
        exit 0
    fi
    echo ""
elif [ "$choice" = "3" ]; then
    echo -e "${BLUE}📊 Iniciando monitoramento em tempo real...${NC}"
    echo -e "${YELLOW}💡 Agora envie mensagens pelo WhatsApp e veja o parsing acontecendo!${NC}"
    echo ""
    echo -e "${CYAN}🔍 Legendas:${NC}"
    echo -e "${GREEN}  🔧 = Parser tradicional${NC}"
    echo -e "${YELLOW}  🤖 = LLM fallback acionada${NC}"
    echo -e "${BLUE}  📝 = Resposta do bot${NC}"
    echo -e "${MAGENTA}  ❓ = Mensagem não identificada${NC}"
    echo ""
    echo -e "${YELLOW}Pressione Ctrl+C para sair${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Monitoramento colorido em tempo real
    docker compose logs -f backend 2>/dev/null | grep --line-buffered -E "(Parser|LLM|BOT RESPONSE)" | while read -r line; do
        clean_line=$(echo "$line" | sed 's/assessor-backend  | //g')
        timestamp=$(echo "$line" | cut -d' ' -f1-2)
        
        if echo "$line" | grep -q "LLM fallback"; then
            echo -e "${YELLOW}🤖 [$timestamp] $clean_line${NC}"
        elif echo "$line" | grep -q "LLM identificou"; then
            echo -e "${GREEN}✅ [$timestamp] $clean_line${NC}"
        elif echo "$line" | grep -q "Parser.*confidence"; then
            echo -e "${CYAN}🔧 [$timestamp] $clean_line${NC}"
        elif echo "$line" | grep -q "BOT RESPONSE"; then
            echo -e "${BLUE}📝 [$timestamp] $clean_line${NC}"
        elif echo "$line" | grep -q "unknown.*confidence.*0"; then
            echo -e "${MAGENTA}❓ [$timestamp] $clean_line${NC}"
        else
            echo -e "  [$timestamp] $clean_line"
        fi
    done
    exit 0
fi

# Modo interativo
echo -e "${GREEN}🎯 MODO INTERATIVO${NC}"
echo -e "${YELLOW}Digite suas mensagens para testar:${NC}"
echo ""
while true; do
    echo -ne "${YELLOW}Digite sua mensagem (ou 'sair' para encerrar): ${NC}"
    read -r message
    
    if [ "$message" = "sair" ] || [ "$message" = "exit" ]; then
        echo -e "${BLUE}👋 Até logo!${NC}"
        echo ""
        echo -e "${CYAN}💡 Dica: Veja todas as transações criadas:${NC}"
        echo "  docker compose exec db psql -U assessor_user -d assessor -c \"SELECT id FROM users WHERE wa_number = '${PHONE_NUMBER}';\""
        echo "  curl -H 'x-user-id: UUID_AQUI' http://localhost:3001/transactions | jq '.'"
        echo ""
        break
    fi
    
    if [ -z "$message" ]; then
        continue
    fi
    
    send_message "$message"
done
