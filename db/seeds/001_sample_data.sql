-- Dados de exemplo para desenvolvimento e testes
-- Execute após as migrations principais

-- Criar usuário de teste
INSERT INTO users (id, wa_number, email) 
VALUES 
  ('550e8400-e29b-41d4-a716-446655440000', '+5511999999999', 'teste@assessor.local'),
  ('660e8400-e29b-41d4-a716-446655440001', '+5511988888888', 'demo@assessor.local')
ON CONFLICT (wa_number) DO NOTHING;

-- Criar categorias padrão para o usuário de teste
SELECT create_default_categories('550e8400-e29b-41d4-a716-446655440000');
SELECT create_default_categories('660e8400-e29b-41d4-a716-446655440001');

-- Inserir transações de exemplo para o primeiro usuário
INSERT INTO transactions (user_id, amount, category_id, occurred_at, note, raw_message)
SELECT 
  '550e8400-e29b-41d4-a716-446655440000',
  amount,
  (SELECT id FROM categories WHERE user_id = '550e8400-e29b-41d4-a716-446655440000' AND name = category_name LIMIT 1),
  occurred_at,
  note,
  raw_message
FROM (VALUES
  (52.30, 'Alimentação', CURRENT_DATE, 'Supermercado', 'mercado 52,30 hoje'),
  (25.00, 'Transporte', CURRENT_DATE - INTERVAL '1 day', 'Uber para trabalho', 'uber 25 ontem'),
  (150.00, 'Saúde', CURRENT_DATE - INTERVAL '2 days', 'Farmácia - remédios', 'farmácia 150'),
  (45.80, 'Alimentação', CURRENT_DATE - INTERVAL '3 days', 'Restaurante almoço', 'restaurante 45,80'),
  (3500.00, 'Salário', CURRENT_DATE - INTERVAL '5 days', 'Salário do mês', 'recebi salário 3500'),
  (500.00, 'Freelance', CURRENT_DATE - INTERVAL '7 days', 'Projeto freelance', 'freelance 500'),
  (1200.00, 'Moradia', CURRENT_DATE - INTERVAL '10 days', 'Aluguel', 'paguei aluguel 1200'),
  (89.90, 'Lazer', CURRENT_DATE - INTERVAL '12 days', 'Netflix + Spotify', 'assinaturas 89,90'),
  (320.00, 'Educação', CURRENT_DATE - INTERVAL '15 days', 'Curso online', 'curso 320'),
  (78.50, 'Alimentação', CURRENT_DATE - INTERVAL '20 days', 'Feira', 'feira 78,50')
) AS t(amount, category_name, occurred_at, note, raw_message);

-- Inserir eventos de exemplo
INSERT INTO events (user_id, title, starts_at, remind_minutes, raw_message)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'Dentista', CURRENT_TIMESTAMP + INTERVAL '2 days' + INTERVAL '10 hours', 60, 'dentista sexta 10h'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Reunião trabalho', CURRENT_TIMESTAMP + INTERVAL '1 day' + INTERVAL '14 hours', 30, 'reunião amanhã 14h'),
  ('550e8400-e29b-41d4-a716-446655440000', 'Academia', CURRENT_TIMESTAMP + INTERVAL '18 hours', 15, 'academia hoje 18h'),
  ('660e8400-e29b-41d4-a716-446655440001', 'Médico', CURRENT_TIMESTAMP + INTERVAL '3 days' + INTERVAL '9 hours', 60, 'médico segunda 9h');

-- Inserir alguns audit logs de exemplo
INSERT INTO audit_logs (user_id, action, meta)
VALUES
  ('550e8400-e29b-41d4-a716-446655440000', 'login', '{"ip": "127.0.0.1", "timestamp": "2025-10-01T09:00:00Z"}'::jsonb),
  ('550e8400-e29b-41d4-a716-446655440000', 'create_transaction', '{"transaction_id": "uuid", "amount": 52.30}'::jsonb);

-- Exibir resumo
SELECT 
  'Usuários criados:' as tipo, 
  COUNT(*)::text as quantidade 
FROM users
UNION ALL
SELECT 
  'Transações criadas:', 
  COUNT(*)::text 
FROM transactions
UNION ALL
SELECT 
  'Eventos criados:', 
  COUNT(*)::text 
FROM events
UNION ALL
SELECT 
  'Categorias criadas:', 
  COUNT(*)::text 
FROM categories;

-- Exibir UUID do usuário de teste
SELECT 
  '🔑 UUID para login no dashboard:' as info,
  id::text as user_id,
  wa_number,
  email
FROM users
WHERE wa_number = '+5511999999999';
