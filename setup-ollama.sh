#!/bin/bash

# Script para configurar Ollama com Gemma 2:2b
# Uso: ./setup-ollama.sh

set -e

echo "🤖 Configurando Ollama para o Assessor Financeiro..."
echo ""

# Verificar se Ollama está rodando
if ! curl -s http://localhost:11434/api/version > /dev/null; then
    echo "❌ Ollama não está rodando. Execute primeiro:"
    echo "   docker compose up ollama -d"
    exit 1
fi

echo "✅ Ollama detectado em http://localhost:11434"

# Verificar modelos já instalados
echo "📋 Verificando modelos instalados..."
MODELS=$(curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | head -10 || echo "")

if echo "$MODELS" | grep -q "gemma2:2b"; then
    echo "✅ Modelo gemma2:2b já instalado"
else
    echo "📥 Baixando modelo gemma2:2b (isso pode levar alguns minutos)..."
    curl -X POST http://localhost:11434/api/pull \
        -H "Content-Type: application/json" \
        -d '{"name": "gemma2:2b"}' || {
        echo "❌ Erro ao baixar modelo. Tentando versão alternativa..."
        curl -X POST http://localhost:11434/api/pull \
            -H "Content-Type: application/json" \
            -d '{"name": "gemma:2b"}'
    }
    
    echo "✅ Modelo baixado com sucesso!"
fi

# Testar modelo
echo ""
echo "🧪 Testando modelo..."
RESPONSE=$(curl -s -X POST http://localhost:11434/api/generate \
    -H "Content-Type: application/json" \
    -d '{
        "model": "gemma2:2b",
        "prompt": "Responda apenas: OK",
        "stream": false,
        "options": {"num_predict": 5}
    }' | grep -o '"response":"[^"]*"' | cut -d'"' -f4 || echo "erro")

if [ "$RESPONSE" != "erro" ]; then
    echo "✅ Teste bem-sucedido! Resposta: $RESPONSE"
else
    echo "⚠️  Teste falhou, mas o modelo foi instalado. Tente reiniciar o container:"
    echo "   docker compose restart ollama"
fi

# Listar modelos disponíveis
echo ""
echo "📦 Modelos disponíveis:"
curl -s http://localhost:11434/api/tags | grep -o '"name":"[^"]*"' | cut -d'"' -f4 | sed 's/^/   - /' || echo "   (nenhum modelo encontrado)"

echo ""
echo "🎉 Setup do Ollama concluído!"
echo ""
echo "💡 Próximos passos:"
echo "   1. O modelo está pronto para uso"
echo "   2. Reinicie o backend: docker compose restart backend"
echo "   3. Teste enviando mensagens pelo WhatsApp"
echo ""
echo "🔧 Comandos úteis:"
echo "   curl http://localhost:11434/api/tags          # Listar modelos"
echo "   docker compose logs ollama                    # Ver logs do Ollama"
echo "   docker compose restart ollama                 # Reiniciar Ollama"
