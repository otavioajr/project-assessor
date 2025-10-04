import { FastifyPluginAsync } from 'fastify';
import { env } from '../config/env.js';
import { pool } from '../config/database.js';
import { parseMessage } from '../nlp/parser.js';
import { WhatsAppMessage } from '../types/index.js';
import axios from 'axios';

/**
 * Analisa query usando LLM de forma simples (sem JSON)
 */
async function analyzeQueryWithLLM(query: string): Promise<string | null> {
  try {
    // Fazer requisição direta ao Ollama
    const response = await axios.post('http://ollama:11434/api/generate', {
      model: 'gemma2:2b',
      prompt: `Analise esta pergunta financeira e identifique o tipo e período temporal.

TIPOS DISPONÍVEIS:
- maior_gasto (maior gasto individual)
- menor_gasto (menor gasto individual)  
- gastos_categoria (gastos por categoria)
- gastos_periodo (gastos de um período específico)
- resumo_geral (resumo geral)

PERÍODOS TEMPORAIS:
- todos_tempos (padrão, se não especificado)
- mes_atual (este mês)
- mes_passado (mês passado)
- semana_atual (esta semana)
- semana_passada (semana passada)

Responda no formato: TIPO|PERIODO

Exemplos:
"qual meu maior gasto?" → maior_gasto|todos_tempos
"maior gasto do mês passado?" → maior_gasto|mes_passado
"gastos desta semana" → gastos_periodo|semana_atual

Pergunta: "${query}"

Resposta:`,
      stream: false,
      options: {
        temperature: 0.1,
        num_predict: 20
      }
    });

    let result = response.data?.response?.trim().toLowerCase();
    console.log(`[Query] LLM respondeu: "${result}"`);
    
    // Limpar prefixos comuns da resposta
    result = result.replace(/^resposta:\s*/, '').replace(/^response:\s*/, '');
    
    // Processar resposta no formato TIPO|PERIODO
    if (result.includes('|')) {
      const [tipo, periodo] = result.split('|');
      const validTypes = ['maior_gasto', 'menor_gasto', 'gastos_categoria', 'gastos_periodo', 'resumo_geral'];
      const validPeriods = ['todos_tempos', 'mes_atual', 'mes_passado', 'semana_atual', 'semana_passada'];
      
      if (validTypes.includes(tipo.trim()) && validPeriods.includes(periodo.trim())) {
        return result; // Retorna "tipo|periodo"
      }
    }
    
    return null;
  } catch (error) {
    console.error('[Query] Erro na análise LLM:', error);
    return null;
  }
}

/**
 * Detecta tipo de query usando heurísticas simples
 */
function detectQueryTypeHeuristic(query: string): string {
  const normalized = query.toLowerCase();
  
  // Detectar período temporal
  let periodo = 'todos_tempos';
  if (normalized.includes('mês passado') || normalized.includes('mes passado')) {
    periodo = 'mes_passado';
  } else if (normalized.includes('este mês') || normalized.includes('mês atual')) {
    periodo = 'mes_atual';
  } else if (normalized.includes('semana passada')) {
    periodo = 'semana_passada';
  } else if (normalized.includes('esta semana') || normalized.includes('semana atual')) {
    periodo = 'semana_atual';
  }
  
  // Detectar tipo
  let tipo = 'resumo_geral';
  if (normalized.includes('maior') && normalized.includes('gasto')) {
    tipo = 'maior_gasto';
  } else if (normalized.includes('menor') && normalized.includes('gasto')) {
    tipo = 'menor_gasto';
  } else if (normalized.includes('categoria') || normalized.includes('onde')) {
    tipo = 'gastos_categoria';
  }
  
  return `${tipo}|${periodo}`;
}

const whatsappRoutes: FastifyPluginAsync = async (fastify) => {
  // GET /whatsapp/webhook - Verificação do webhook (Meta)
  fastify.get('/webhook', async (request, reply) => {
    const query = request.query as any;
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];

    if (mode === 'subscribe' && token === env.WA_VERIFY_TOKEN) {
      fastify.log.info('✅ Webhook verified');
      return reply.send(challenge);
    }

    return reply.code(403).send('Forbidden');
  });

  // POST /whatsapp/webhook - Receber mensagens
  fastify.post('/webhook', async (request, reply) => {
    const body = request.body as any;

    try {
      const entry = body.entry?.[0];
      const changes = entry?.changes?.[0];
      const value = changes?.value;
      const messages = value?.messages;

      if (!messages || messages.length === 0) {
        return reply.send({ status: 'ok' });
      }

      const message = messages[0];
      const from = message.from; // número do WhatsApp
      const messageId = message.id;
      const text = message.text?.body;
      const timestamp = message.timestamp;

      if (!text) {
        return reply.send({ status: 'ok' });
      }

      // Verificar idempotência (evitar processar mensagem duplicada)
      const idempotencyCheck = await pool.query(
        'SELECT message_id FROM message_idempotency WHERE message_id = $1',
        [messageId]
      );

      if (idempotencyCheck.rows.length > 0) {
        fastify.log.info(`⚠️ Message already processed: ${messageId}`);
        return reply.send({ status: 'ok' });
      }

      // Registrar message_id
      await pool.query('INSERT INTO message_idempotency (message_id) VALUES ($1)', [messageId]);

      // Processar mensagem
      await processMessage({ message_id: messageId, from, timestamp, text, type: 'text' });

      return reply.send({ status: 'ok' });
    } catch (error) {
      fastify.log.error(error as Error, '❌ Error processing webhook');
      return reply.code(500).send({ error: 'Internal server error' });
    }
  });
};

/**
 * Processa a mensagem recebida do WhatsApp
 */
async function processMessage(msg: WhatsAppMessage) {
  const { message_id, from, text } = msg;

  // 1. Buscar ou criar usuário
  let user = await pool.query('SELECT id FROM users WHERE wa_number = $1', [from]);

  let userId: string;
  if (user.rows.length === 0) {
    // Criar novo usuário
    const newUser = await pool.query(
      'INSERT INTO users (wa_number) VALUES ($1) RETURNING id',
      [from]
    );
    userId = newUser.rows[0].id;

    // Criar categorias padrão
    await pool.query('SELECT create_default_categories($1)', [userId]);

    // Mensagem de boas-vindas
    await sendWhatsAppMessage(from, '👋 Olá! Sou seu assistente financeiro. Envie seus gastos e compromissos que vou organizar tudo para você!');
  } else {
    userId = user.rows[0].id;
  }

  // 2. Processar transações pendentes antigas (mais de 2 minutos) - categorizar como "Outros"
  const oldPending = await pool.query(
    `SELECT id, amount, occurred_at, note, is_income 
     FROM pending_transactions 
     WHERE user_id = $1 
       AND created_at <= NOW() - INTERVAL '2 minutes'`,
    [userId]
  );

  for (const pending of oldPending.rows) {
    // Buscar categoria "Outros"
    const kind = pending.is_income ? 'income' : 'expense';
    let othersCategory = await pool.query(
      'SELECT id FROM categories WHERE user_id = $1 AND kind = $2 AND LOWER(name) = $3',
      [userId, kind, 'outros']
    );

    // Se não existe categoria "Outros", criar
    if (othersCategory.rows.length === 0) {
      const newCategory = await pool.query(
        'INSERT INTO categories (user_id, name, kind) VALUES ($1, $2, $3) RETURNING id',
        [userId, 'Outros', kind]
      );
      othersCategory = newCategory;
    }

    // Criar transação com categoria "Outros"
    await pool.query(
      `INSERT INTO transactions (user_id, amount, category_id, occurred_at, note)
       VALUES ($1, $2, $3, $4, $5)`,
      [userId, pending.amount, othersCategory.rows[0].id, pending.occurred_at, pending.note]
    );

    // Remover pending
    await pool.query('DELETE FROM pending_transactions WHERE id = $1', [pending.id]);

    // Notificar usuário
    await sendWhatsAppMessage(from, `⏰ Tempo esgotado! Categorizei como "Outros": R$ ${pending.amount}`);
  }

  // 3. Verificar se há transação pendente esperando categoria
  const hasPending = await pool.query(
    `SELECT id, amount, occurred_at, note, is_income, created_at 
     FROM pending_transactions 
     WHERE user_id = $1 
     ORDER BY created_at DESC 
     LIMIT 1`,
    [userId]
  );

  if (hasPending.rows.length > 0) {
    // Usuário está respondendo com a categoria
    const pending = hasPending.rows[0];
    const categoryId = await findCategoryByUserResponse(userId, text, pending.is_income);
    
    if (categoryId) {
      // Criar transação com a categoria escolhida
      await pool.query(
        `INSERT INTO transactions (user_id, amount, category_id, occurred_at, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [userId, pending.amount, categoryId, pending.occurred_at, pending.note]
      );
      
      // Remover pending
      await pool.query('DELETE FROM pending_transactions WHERE id = $1', [pending.id]);
      
      // Buscar nome da categoria
      const catResult = await pool.query('SELECT name FROM categories WHERE id = $1', [categoryId]);
      const categoryName = catResult.rows[0].name;
      
      await sendWhatsAppMessage(from, `✅ Anotado! ${categoryName}: R$ ${pending.amount}`);
      return;
    } else {
      // Mostrar categorias disponíveis novamente
      const kind = pending.is_income ? 'income' : 'expense';
      const categories = await pool.query(
        'SELECT name FROM categories WHERE user_id = $1 AND kind = $2 ORDER BY name',
        [userId, kind]
      );
      
      let message = `❌ Categoria "${text}" não encontrada.\n\n📂 Escolha uma das opções:\n`;
      categories.rows.forEach((cat: any, idx: number) => {
        message += `${idx + 1}. ${cat.name}\n`;
      });
      message += '\n💡 Você pode digitar o número ou o nome da categoria.';
      
      await sendWhatsAppMessage(from, message);
      return;
    }
  }

  // 3. Parsear mensagem nova
  const parsed = await parseMessage(text);
  
  // Log para debug
  console.log(`[DEBUG] Parsed message: type=${parsed.type}, category=${parsed.data?.category}, amount=${parsed.data?.amount}`);

  // 4. Agir conforme o tipo
  if (parsed.type === 'transaction' && parsed.data) {
    // Verificar se categoria foi detectada automaticamente
    if (parsed.data.category) {
      console.log(`[DEBUG] Category detected: ${parsed.data.category}`);
      // Buscar ID da categoria
      const isIncome = text.toLowerCase().includes('receb') || text.toLowerCase().includes('entrada');
      const kind = isIncome ? 'income' : 'expense';
      
      const categoryResult = await pool.query(
        'SELECT id FROM categories WHERE user_id = $1 AND name = $2 AND kind = $3 LIMIT 1',
        [userId, parsed.data.category, kind]
      );

      if (categoryResult.rows.length > 0) {
        // Categoria encontrada - salvar direto
        await pool.query(
          `INSERT INTO transactions (user_id, amount, category_id, occurred_at, note)
           VALUES ($1, $2, $3, $4, $5)`,
          [userId, parsed.data.amount, categoryResult.rows[0].id, parsed.data.date || new Date(), text]
        );
        await sendWhatsAppMessage(from, `✅ Anotado! ${parsed.data.category}: R$ ${parsed.data.amount?.toFixed(2)}`);
      } else {
        // Categoria não encontrada - perguntar
        await savePendingTransaction(userId, parsed.data, text);
        const categories = await getCategories(userId, kind);
        await sendWhatsAppMessage(from, `💰 Registrei: R$ ${parsed.data.amount?.toFixed(2)}\n\n📂 Em qual categoria?\n${categories}`);
      }
    } else {
      // Sem categoria detectada - perguntar
      await savePendingTransaction(userId, parsed.data, text);
      const isIncome = text.toLowerCase().includes('receb') || text.toLowerCase().includes('entrada');
      const kind = isIncome ? 'income' : 'expense';
      const categories = await getCategories(userId, kind);
      await sendWhatsAppMessage(from, `💰 Registrei: R$ ${parsed.data.amount?.toFixed(2)}\n\n📂 Em qual categoria?\n${categories}`);
    }
  } else if (parsed.type === 'event' && parsed.data) {
    await handleEvent(userId, parsed.data, text);
    await sendWhatsAppMessage(from, `📅 Compromisso agendado: ${parsed.data.eventTitle}`);
  } else if (parsed.type === 'query') {
    // Usar LLM para analisar a intenção da query e executar consulta específica
    const queryResult = await handleIntelligentQuery(userId, text, parsed.reasoning);
    await sendWhatsAppMessage(from, queryResult);
  } else {
    await sendWhatsAppMessage(from, '🤔 Não entendi. Tente: "uber 25" ou "recebido 3000"');
  }
}

/**
 * Salva transação pendente (aguardando categoria)
 */
async function savePendingTransaction(
  userId: string,
  data: { amount?: number; date?: Date; note?: string },
  rawMessage: string
) {
  const { amount, date, note } = data;
  
  // Verificar se é receita ou despesa (por padrão, assumir despesa)
  const isIncome = note?.toLowerCase().includes('receb') || note?.toLowerCase().includes('entrada') || false;

  await pool.query(
    `INSERT INTO pending_transactions (user_id, amount, occurred_at, note, raw_message, is_income)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [userId, amount, date || new Date(), note, rawMessage, isIncome]
  );
}

/**
 * Busca categorias do usuário e formata para exibição
 */
async function getCategories(userId: string, kind: 'expense' | 'income'): Promise<string> {
  const result = await pool.query(
    'SELECT id, name FROM categories WHERE user_id = $1 AND kind = $2 ORDER BY name',
    [userId, kind]
  );

  return result.rows.map((cat, idx) => `${idx + 1}. ${cat.name}`).join('\n');
}

/**
 * Encontra categoria pela resposta do usuário (número ou nome)
 */
async function findCategoryByUserResponse(
  userId: string,
  response: string,
  isIncome: boolean
): Promise<number | null> {
  const normalized = response.toLowerCase().trim();
  const kind = isIncome ? 'income' : 'expense';

  console.log(`[DEBUG] Buscando categoria: "${normalized}" para ${kind}`);

  // Tentar por número primeiro
  const num = parseInt(normalized);
  if (!isNaN(num) && num > 0) {
    const result = await pool.query(
      'SELECT id, name FROM categories WHERE user_id = $1 AND kind = $2 ORDER BY name LIMIT 1 OFFSET $3',
      [userId, kind, num - 1]
    );
    
    if (result.rows.length > 0) {
      console.log(`[DEBUG] Categoria encontrada por número ${num}: ${result.rows[0].name}`);
      return result.rows[0].id;
    }
  }

  // Tentar por nome exato
  let result = await pool.query(
    'SELECT id, name FROM categories WHERE user_id = $1 AND kind = $2 AND LOWER(name) = $3',
    [userId, kind, normalized]
  );

  if (result.rows.length > 0) {
    console.log(`[DEBUG] Categoria encontrada por nome exato: ${result.rows[0].name}`);
    return result.rows[0].id;
  }

  // Tentar por nome parcial (contém)
  result = await pool.query(
    'SELECT id, name FROM categories WHERE user_id = $1 AND kind = $2 AND LOWER(name) LIKE $3 ORDER BY name LIMIT 1',
    [userId, kind, `%${normalized}%`]
  );

  if (result.rows.length > 0) {
    console.log(`[DEBUG] Categoria encontrada por nome parcial: ${result.rows[0].name}`);
    return result.rows[0].id;
  }

  // Tentar busca mais flexível (palavras-chave)
  const keywords = normalized.split(/\s+/);
  for (const keyword of keywords) {
    if (keyword.length >= 3) { // Só palavras com 3+ caracteres
      result = await pool.query(
        'SELECT id, name FROM categories WHERE user_id = $1 AND kind = $2 AND LOWER(name) LIKE $3 ORDER BY name LIMIT 1',
        [userId, kind, `%${keyword}%`]
      );
      
      if (result.rows.length > 0) {
        console.log(`[DEBUG] Categoria encontrada por palavra-chave "${keyword}": ${result.rows[0].name}`);
        return result.rows[0].id;
      }
    }
  }

  console.log(`[DEBUG] Nenhuma categoria encontrada para: "${normalized}"`);
  
  // Listar categorias disponíveis para debug
  const allCategories = await pool.query(
    'SELECT id, name FROM categories WHERE user_id = $1 AND kind = $2 ORDER BY name',
    [userId, kind]
  );
  console.log(`[DEBUG] Categorias disponíveis (${kind}):`, allCategories.rows.map(c => c.name));

  return null;
}

/**
 * Cria um evento no banco
 */
async function handleEvent(
  userId: string,
  data: { eventTitle?: string; eventTime?: Date },
  rawMessage: string
) {
  const { eventTitle, eventTime } = data;

  await pool.query(
    `INSERT INTO events (user_id, title, starts_at, raw_message)
     VALUES ($1, $2, $3, $4)`,
    [userId, eventTitle, eventTime, rawMessage]
  );
}

/**
 * Analisa a intenção da query usando LLM e executa consulta específica
 */
async function handleIntelligentQuery(userId: string, query: string, reasoning?: string): Promise<string> {
  console.log(`[Query] Analisando: "${query}" (reasoning: ${reasoning})`);
  
  // Importar LLM provider
  const { LLMProviderFactory } = await import('../nlp/llm/index.js');
  const { getLLMConfig } = await import('../config/llm.js');
  
  try {
    const config = getLLMConfig();
    const llmProvider = await LLMProviderFactory.createAndTest(config);
    
    if (llmProvider.name === 'Disabled') {
      // Fallback para resumo geral se LLM não disponível
      return await getSummary(userId);
    }
    
    // Prompt específico para análise de queries financeiras
    const analysisPrompt = `Você é um assistente financeiro. Analise esta pergunta do usuário e identifique o tipo de consulta.

PERGUNTA: "${query}"

TIPOS DE CONSULTA DISPONÍVEIS:
1. "maior_gasto" - Usuário quer saber qual foi seu maior gasto individual
2. "menor_gasto" - Usuário quer saber qual foi seu menor gasto individual  
3. "gastos_categoria" - Usuário quer saber gastos de uma categoria específica
4. "resumo_geral" - Usuário quer um resumo geral (saldo, total de gastos, etc.)
5. "gastos_periodo" - Usuário quer gastos de um período específico

Responda APENAS com o tipo identificado (ex: "maior_gasto") ou "resumo_geral" se não souber.`;

    // Usar método mais simples para análise de queries
    const queryType = await analyzeQueryWithLLM(query);
    console.log(`[Query] Tipo identificado: "${queryType}"`);
    
    // Se a análise falhar, usar heurísticas simples
    const finalQueryType = queryType || detectQueryTypeHeuristic(query);
    
    console.log(`[Query] LLM identificou tipo: "${queryType}"`);
    
    // Processar tipo e período
    const [tipo, periodo] = finalQueryType.includes('|') ? 
      finalQueryType.split('|') : [finalQueryType, 'todos_tempos'];
    
    console.log(`[Query] Executando: tipo="${tipo}", periodo="${periodo}"`);
    
    // Executar consulta específica baseada no tipo e período
    switch (tipo) {
      case 'maior_gasto':
        return await getLargestExpense(userId, periodo);
      case 'menor_gasto':
        return await getSmallestExpense(userId, periodo);
      case 'gastos_categoria':
        return await getExpensesByCategory(userId, periodo);
      case 'gastos_periodo':
        return await getExpensesByPeriod(userId, periodo);
      default:
        return await getSummary(userId);
    }
    
  } catch (error) {
    console.error('[Query] Erro na análise LLM:', error);
    // Fallback para resumo geral em caso de erro
    return await getSummary(userId);
  }
}

/**
 * Retorna o maior gasto individual
 */
async function getLargestExpense(userId: string, periodo: string = 'todos_tempos'): Promise<string> {
  // Construir filtro de data baseado no período
  let dateFilter = '';
  if (periodo === 'mes_atual') {
    dateFilter = "AND t.occurred_at >= date_trunc('month', CURRENT_DATE)";
  } else if (periodo === 'mes_passado') {
    dateFilter = `AND t.occurred_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
                  AND t.occurred_at < date_trunc('month', CURRENT_DATE)`;
  } else if (periodo === 'semana_atual') {
    dateFilter = "AND t.occurred_at >= date_trunc('week', CURRENT_DATE)";
  } else if (periodo === 'semana_passada') {
    dateFilter = `AND t.occurred_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '1 week'
                  AND t.occurred_at < date_trunc('week', CURRENT_DATE)`;
  }

  const result = await pool.query(`
    SELECT t.amount, t.occurred_at, t.note, c.name as category_name
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1 AND c.kind = 'expense' ${dateFilter}
    ORDER BY t.amount DESC
    LIMIT 1
  `, [userId]);
  
  if (result.rows.length === 0) {
    return '📊 Você ainda não tem gastos registrados.';
  }
  
  const expense = result.rows[0];
  const date = new Date(expense.occurred_at).toLocaleDateString('pt-BR');
  
  return `💸 **Seu maior gasto:**
💰 R$ ${parseFloat(expense.amount).toFixed(2)}
📂 Categoria: ${expense.category_name}
📅 Data: ${date}
📝 Descrição: ${expense.note || 'Sem descrição'}`;
}

/**
 * Retorna o menor gasto individual
 */
async function getSmallestExpense(userId: string, periodo: string = 'todos_tempos'): Promise<string> {
  // Construir filtro de data baseado no período
  let dateFilter = '';
  if (periodo === 'mes_atual') {
    dateFilter = "AND t.occurred_at >= date_trunc('month', CURRENT_DATE)";
  } else if (periodo === 'mes_passado') {
    dateFilter = `AND t.occurred_at >= date_trunc('month', CURRENT_DATE) - INTERVAL '1 month'
                  AND t.occurred_at < date_trunc('month', CURRENT_DATE)`;
  } else if (periodo === 'semana_atual') {
    dateFilter = "AND t.occurred_at >= date_trunc('week', CURRENT_DATE)";
  } else if (periodo === 'semana_passada') {
    dateFilter = `AND t.occurred_at >= date_trunc('week', CURRENT_DATE) - INTERVAL '1 week'
                  AND t.occurred_at < date_trunc('week', CURRENT_DATE)`;
  }

  const result = await pool.query(`
    SELECT t.amount, t.occurred_at, t.note, c.name as category_name
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1 AND c.kind = 'expense' ${dateFilter}
    ORDER BY t.amount ASC
    LIMIT 1
  `, [userId]);
  
  if (result.rows.length === 0) {
    return '📊 Você ainda não tem gastos registrados.';
  }
  
  const expense = result.rows[0];
  const date = new Date(expense.occurred_at).toLocaleDateString('pt-BR');
  
  return `💸 **Seu menor gasto:**
💰 R$ ${parseFloat(expense.amount).toFixed(2)}
📂 Categoria: ${expense.category_name}
📅 Data: ${date}
📝 Descrição: ${expense.note || 'Sem descrição'}`;
}

/**
 * Retorna gastos por categoria (top 5)
 */
async function getExpensesByCategory(userId: string, periodo: string = 'todos_tempos'): Promise<string> {
  const result = await pool.query(`
    SELECT c.name as category_name, SUM(t.amount) as total
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1 AND c.kind = 'expense'
    GROUP BY c.name
    ORDER BY total DESC
    LIMIT 5
  `, [userId]);
  
  if (result.rows.length === 0) {
    return '📊 Você ainda não tem gastos registrados.';
  }
  
  let message = '📊 **Gastos por categoria:**\n\n';
  result.rows.forEach((row: any, index: number) => {
    message += `${index + 1}. ${row.category_name}: R$ ${parseFloat(row.total).toFixed(2)}\n`;
  });
  
  return message;
}

/**
 * Retorna gastos do período atual
 */
async function getExpensesByPeriod(userId: string, periodo: string = 'todos_tempos'): Promise<string> {
  const result = await pool.query(`
    SELECT t.amount, t.occurred_at, t.note, c.name as category_name
    FROM transactions t
    JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1 AND c.kind = 'expense'
      AND t.occurred_at >= date_trunc('month', CURRENT_DATE)
    ORDER BY t.occurred_at DESC
    LIMIT 10
  `, [userId]);
  
  if (result.rows.length === 0) {
    return '📊 Você não tem gastos registrados neste mês.';
  }
  
  let message = '📊 **Gastos deste mês:**\n\n';
  result.rows.forEach((row: any) => {
    const date = new Date(row.occurred_at).toLocaleDateString('pt-BR');
    message += `💰 R$ ${parseFloat(row.amount).toFixed(2)} - ${row.category_name} (${date})\n`;
  });
  
  return message;
}

/**
 * Retorna resumo do mês atual
 */
async function getSummary(userId: string): Promise<string> {
  const result = await pool.query(
    `SELECT
      COALESCE(SUM(CASE WHEN c.kind = 'income' THEN t.amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN c.kind = 'expense' THEN t.amount ELSE 0 END), 0) as expense
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1
      AND DATE_TRUNC('month', t.occurred_at) = DATE_TRUNC('month', CURRENT_DATE)`,
    [userId]
  );

  const { income, expense } = result.rows[0];
  const balance = parseFloat(income) - parseFloat(expense);

  return `📊 Resumo do mês:\n💰 Receitas: R$ ${parseFloat(income).toFixed(2)}\n💸 Despesas: R$ ${parseFloat(expense).toFixed(2)}\n📈 Saldo: R$ ${balance.toFixed(2)}`;
}

/**
 * Envia mensagem via WhatsApp Business API
 */
async function sendWhatsAppMessage(to: string, message: string) {
  // Modo dev: apenas logar, não enviar para API real
  if (env.WA_ACCESS_TOKEN.startsWith('dev-')) {
    console.log(`\n📱 [BOT RESPONSE] To: ${to}\n${message}\n`);
    return;
  }

  try {
    await axios.post(
      `https://graph.facebook.com/v18.0/${env.WA_PHONE_NUMBER_ID}/messages`,
      {
        messaging_product: 'whatsapp',
        to,
        text: { body: message },
      },
      {
        headers: {
          Authorization: `Bearer ${env.WA_ACCESS_TOKEN}`,
          'Content-Type': 'application/json',
        },
      }
    );
    console.log(`✅ WhatsApp message sent to ${to}`);
  } catch (error) {
    console.error('❌ Error sending WhatsApp message:', error);
  }
}

export default whatsappRoutes;
