.PHONY: help setup up down restart logs clean install test lint build

help:
	@echo "📚 Comandos disponíveis:"
	@echo ""
	@echo "  make setup      - Setup inicial completo"
	@echo "  make up         - Subir todos os serviços"
	@echo "  make down       - Parar todos os serviços"
	@echo "  make restart    - Reiniciar serviços"
	@echo "  make logs       - Ver logs em tempo real"
	@echo "  make clean      - Limpar tudo (containers + volumes)"
	@echo "  make install    - Instalar dependências"
	@echo "  make test       - Rodar testes"
	@echo "  make lint       - Rodar linter"
	@echo "  make build      - Build de produção"
	@echo "  make seed       - Inserir dados de exemplo"
	@echo ""

setup:
	@bash setup.sh

up:
	@docker compose up -d
	@echo "✅ Serviços iniciados!"

down:
	@docker compose down
	@echo "✅ Serviços parados!"

restart:
	@docker compose restart
	@echo "✅ Serviços reiniciados!"

logs:
	@docker compose logs -f

clean:
	@docker compose down -v
	@echo "✅ Tudo limpo!"

install:
	@echo "📦 Instalando dependências do backend..."
	@cd backend && npm install
	@echo "📦 Instalando dependências do frontend..."
	@cd frontend && npm install
	@echo "✅ Dependências instaladas!"

test:
	@echo "🧪 Rodando testes do backend..."
	@cd backend && npm test

lint:
	@echo "🔍 Rodando linter no backend..."
	@cd backend && npm run lint
	@echo "🔍 Rodando linter no frontend..."
	@cd frontend && npm run lint

build:
	@echo "🏗️  Build do backend..."
	@cd backend && npm run build
	@echo "🏗️  Build do frontend..."
	@cd frontend && npm run build
	@echo "✅ Build concluído!"

seed:
	@echo "🌱 Inserindo dados de exemplo..."
	@docker compose exec -T db psql -U assessor_user -d assessor < db/seeds/001_sample_data.sql
	@echo "✅ Dados inseridos!"
	@echo ""
	@echo "🔑 UUID para login: 550e8400-e29b-41d4-a716-446655440000"

migrate:
	@echo "🔄 Rodando migrations..."
	@docker compose exec backend npm run migrate
	@echo "✅ Migrations concluídas!"

db:
	@docker compose exec db psql -U assessor_user -d assessor

health:
	@echo "🏥 Verificando saúde dos serviços..."
	@curl -s http://localhost:3001/health | jq '.' || echo "❌ Backend não respondeu"
	@curl -s http://localhost:5173 > /dev/null && echo "✅ Frontend: OK" || echo "❌ Frontend: Não respondeu"
