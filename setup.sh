#!/bin/bash

# Script de setup automático do Assessor Financeiro
# Uso: ./setup.sh

set -e

echo "🚀 Iniciando setup do Assessor Financeiro..."
echo ""

# Verificar Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Docker não encontrado. Instale em: https://www.docker.com/get-started"
    exit 1
fi

if ! command -v docker compose &> /dev/null; then
    echo "❌ Docker Compose não encontrado. Instale Docker Desktop ou docker-compose-plugin"
    exit 1
fi

echo "✅ Docker encontrado: $(docker --version)"
echo "✅ Docker Compose encontrado: $(docker compose version)"
echo ""

# Verificar .env
if [ ! -f .env ]; then
    echo "📝 Criando arquivo .env..."
    cp .env.example .env
    echo "⚠️  IMPORTANTE: Edite o arquivo .env com suas credenciais antes de continuar!"
    echo "   Principais variáveis:"
    echo "   - WA_VERIFY_TOKEN"
    echo "   - WA_ACCESS_TOKEN"
    echo "   - WA_PHONE_NUMBER_ID"
    echo "   - SUPABASE_URL e SUPABASE_SERVICE_KEY"
    echo ""
    read -p "Pressione ENTER depois de editar o .env..."
fi

echo "✅ Arquivo .env encontrado"
echo ""

# Limpar containers antigos (opcional)
read -p "🗑️  Limpar containers e volumes antigos? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "🧹 Limpando..."
    docker compose down -v 2>/dev/null || true
fi

# Subir serviços
echo "🐳 Subindo serviços Docker..."
docker compose up -d

echo ""
echo "⏳ Aguardando serviços iniciarem (30 segundos)..."
sleep 30

# Verificar saúde
echo ""
echo "🏥 Verificando saúde dos serviços..."

if curl -s http://localhost:3001/health > /dev/null; then
    echo "✅ Backend: OK (http://localhost:3001)"
else
    echo "⚠️  Backend: Ainda não respondeu, pode levar mais alguns segundos"
fi

if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ Frontend: OK (http://localhost:5173)"
else
    echo "⚠️  Frontend: Ainda não respondeu, pode levar mais alguns segundos"
fi

# Aplicar seeds (opcional)
echo ""
read -p "🌱 Deseja inserir dados de exemplo? (s/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Ss]$ ]]; then
    echo "📊 Inserindo dados de exemplo..."
    docker compose exec -T db psql -U assessor_user -d assessor < db/seeds/001_sample_data.sql
    echo "✅ Dados de exemplo inseridos!"
    echo ""
    echo "🔑 UUID do usuário de teste: 550e8400-e29b-41d4-a716-446655440000"
    echo "   Use este UUID para fazer login no dashboard"
fi

# Finalizar
echo ""
echo "🎉 Setup concluído!"
echo ""
echo "📌 Serviços disponíveis:"
echo "   Frontend:  http://localhost:5173"
echo "   Backend:   http://localhost:3001"
echo "   PgAdmin:   http://localhost:5050"
echo "   Ollama:    http://localhost:11434"
echo ""
echo "📖 Próximos passos:"
echo "   1. Acesse o frontend em http://localhost:5173"
echo "   2. Use o UUID de teste para login (se inseriu dados de exemplo)"
echo "   3. Configure o webhook do WhatsApp (veja QUICKSTART.md)"
echo ""
echo "🔧 Comandos úteis:"
echo "   docker compose logs -f        # Ver logs"
echo "   docker compose restart        # Reiniciar"
echo "   docker compose down           # Parar"
echo ""
echo "📚 Documentação: README.md e QUICKSTART.md"
