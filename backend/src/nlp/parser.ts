import { ParsedMessage } from '../types/index.js';
import { addDays, setHours, setMinutes, startOfDay } from 'date-fns';
import { toZonedTime } from 'date-fns-tz';
import { LLMProviderFactory, ParseContext } from './llm/index.js';
import { getLLMConfig, PROJECT_SCOPE, AVAILABLE_CATEGORIES } from '../config/llm.js';

const TIMEZONE = 'America/Sao_Paulo';

// Instância do provedor LLM (inicializada no startup)
let llmProvider: any = null;

/**
 * Inicializa o provedor de LLM
 */
export async function initializeLLMProvider(): Promise<void> {
  try {
    const config = getLLMConfig();
    llmProvider = await LLMProviderFactory.createAndTest(config);
    console.log(`[Parser] LLM Provider inicializado: ${llmProvider.name}`);
  } catch (error) {
    console.error('[Parser] Erro ao inicializar LLM Provider:', error);
    llmProvider = null;
  }
}

// Dicionário de categorias (palavras-chave → categoria)
const CATEGORY_KEYWORDS: Record<string, string> = {
  // Custos Fixos
  aluguel: 'Custos Fixos',
  condomínio: 'Custos Fixos',
  luz: 'Custos Fixos',
  água: 'Custos Fixos',
  internet: 'Custos Fixos',
  gás: 'Custos Fixos',
  conta: 'Custos Fixos',
  'custos fixos': 'Custos Fixos',
  'custo fixo': 'Custos Fixos',

  // Conforto
  conforto: 'Conforto',
  casa: 'Conforto',
  móveis: 'Conforto',
  decoração: 'Conforto',

  // Liberdade Financeira
  investimento: 'Liberdade Financeira',
  poupança: 'Liberdade Financeira',
  'liberdade financeira': 'Liberdade Financeira',
  aplicação: 'Liberdade Financeira',

  // Aumentar Renda/Empreender
  curso: 'Aumentar Renda/Empreender',
  capacitação: 'Aumentar Renda/Empreender',
  negócio: 'Aumentar Renda/Empreender',
  empreender: 'Aumentar Renda/Empreender',
  'aumentar renda': 'Aumentar Renda/Empreender',

  // Prazeres
  prazeres: 'Prazeres',
  prazer: 'Prazeres',
  diversão: 'Prazeres',
  lazer: 'Prazeres',
  cinema: 'Prazeres',
  show: 'Prazeres',
  festa: 'Prazeres',
  balada: 'Prazeres',
  bar: 'Prazeres',
  cerveja: 'Prazeres',
  vodka: 'Prazeres',
  bebida: 'Prazeres',
  restaurante: 'Prazeres',

  // Metas
  metas: 'Metas',
  meta: 'Metas',
  objetivo: 'Metas',
  sonho: 'Metas',

  // Prazeres Futuros
  'prazeres futuros': 'Prazeres Futuros',
  'prazer futuro': 'Prazeres Futuros',
  viagem: 'Prazeres Futuros',

  // Reserva de Oportunidade
  reserva: 'Reserva de Oportunidade',
  'reserva de oportunidade': 'Reserva de Oportunidade',
  emergência: 'Reserva de Oportunidade',
};

// Regex para extrair valores em BRL
const AMOUNT_REGEX = /(?:r\$?\s*)?(\d{1,4}(?:[.,]\d{1,2})?)/i;

// Palavras que indicam receita
const INCOME_KEYWORDS = ['receb', 'salário', 'pagamento', 'deposito', 'entrada', 'freelance'];

/**
 * Extrai descrição limpa removendo valor, categoria e palavras de data
 */
function extractCleanDescription(text: string): string {
  let clean = text;

  // Remover valores monetários (ex: 30, 30.50, R$ 30, 30 reais)
  clean = clean.replace(/r\$?\s*\d{1,4}(?:[.,]\d{1,2})?/gi, '');
  clean = clean.replace(/\d{1,4}(?:[.,]\d{1,2})?\s*reais?/gi, '');
  
  // Remover palavras de categoria conhecidas
  const categoryWords = Object.keys(CATEGORY_KEYWORDS);
  categoryWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    clean = clean.replace(regex, '');
  });
  
  // Remover palavras de data (hoje, ontem, amanhã, etc.)
  const dateWords = ['hoje', 'ontem', 'amanhã', 'em', 'para', 'de'];
  dateWords.forEach(word => {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    clean = clean.replace(regex, '');
  });
  
  // Remover datas no formato dd/mm ou dd/mm/yyyy
  clean = clean.replace(/\d{1,2}\/\d{1,2}(?:\/\d{2,4})?/g, '');
  
  // Limpar espaços extras e retornar
  return clean.replace(/\s+/g, ' ').trim();
}

/**
 * Parser principal: analisa uma mensagem e retorna o tipo e dados extraídos
 */
export async function parseMessage(text: string): Promise<ParsedMessage> {
  const normalized = text.toLowerCase().trim();

  // 1. Verificar se é uma query (saldo, resumo, etc.)
  if (isQuery(normalized)) {
    return {
      type: 'query',
      confidence: 0.9,
      reasoning: 'Palavra-chave de consulta identificada'
    };
  }

  // 2. Tentar extrair valor (indicativo de transação)
  const amount = extractAmount(normalized);
  if (amount) {
    const category = extractCategory(normalized);
    const date = extractDate(normalized);
    const isIncome = INCOME_KEYWORDS.some((kw) => normalized.includes(kw));
    const cleanNote = extractCleanDescription(text);

    return {
      type: 'transaction',
      data: {
        amount,
        category: category || (isIncome ? 'Outros' : 'Outros'),
        date: date || new Date(),
        note: cleanNote || text, // Usa descrição limpa ou texto original se vazio
      },
      confidence: category ? 0.85 : 0.6,
      reasoning: category ? `Valor e categoria (${category}) identificados` : 'Valor identificado, categoria inferida'
    };
  }

  // 3. Tentar extrair evento (data/hora + título)
  const eventTime = extractDateTime(normalized);
  if (eventTime) {
    return {
      type: 'event',
      data: {
        eventTitle: text,
        eventTime,
      },
      confidence: 0.75,
      reasoning: 'Data/hora e título de evento identificados'
    };
  }

  // 4. Fallback para LLM se disponível
  if (llmProvider && llmProvider.name !== 'Disabled') {
    try {
      console.log('[Parser] Usando LLM fallback para:', text.substring(0, 50));
      
      const context: ParseContext = {
        availableCategories: AVAILABLE_CATEGORIES,
        currentDate: new Date(),
        projectScope: PROJECT_SCOPE,
        maxConfidence: 0.7 // LLM não pode ter mais confiança que parser tradicional
      };

      const llmResult = await llmProvider.parseMessage(text, context);
      
      if (llmResult.type !== 'unknown') {
        console.log(`[Parser] LLM identificou: ${llmResult.type} (confiança: ${llmResult.confidence})`);
        return {
          ...llmResult,
          reasoning: `LLM: ${llmResult.reasoning}`
        };
      }
    } catch (error) {
      console.error('[Parser] Erro no LLM fallback:', error);
    }
  }

  // 5. Desconhecido
  return {
    type: 'unknown',
    confidence: 0,
    reasoning: 'Nenhum padrão identificado pelo parser tradicional ou LLM'
  };
}

/**
 * Verifica se é uma query (saldo, resumo, etc.)
 */
function isQuery(text: string): boolean {
  const queryKeywords = [
    'saldo', 'resumo', 'total', 'gastos', 'quanto', 'relatório',
    'maior', 'menor', 'mais', 'menos', 'extrato', 'balanço',
    'onde', 'como', 'quando', 'qual', 'quais', 'mostrar',
    'listar', 'ver', 'consultar', 'verificar', 'conferir'
  ];
  return queryKeywords.some((kw) => text.includes(kw));
}

/**
 * Extrai valor monetário (BRL)
 */
function extractAmount(text: string): number | undefined {
  const match = text.match(AMOUNT_REGEX);
  if (!match) return undefined;

  const valueStr = match[1].replace(',', '.');
  const value = parseFloat(valueStr);
  return isNaN(value) ? undefined : value;
}

/**
 * Extrai categoria baseado em palavras-chave
 */
function extractCategory(text: string): string | undefined {
  for (const [keyword, category] of Object.entries(CATEGORY_KEYWORDS)) {
    if (text.includes(keyword)) {
      return category;
    }
  }
  return undefined;
}

/**
 * Extrai data relativa (hoje, ontem, amanhã, etc.)
 */
function extractDate(text: string): Date | undefined {
  const now = new Date();

  if (text.includes('hoje')) {
    return now;
  }
  if (text.includes('ontem')) {
    return addDays(now, -1);
  }
  if (text.includes('amanhã')) {
    return addDays(now, 1);
  }

  // Tentar parsear datas explícitas (dd/mm, dd/mm/yyyy)
  const dateMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/);
  if (dateMatch) {
    const day = parseInt(dateMatch[1]);
    const month = parseInt(dateMatch[2]) - 1; // month is 0-indexed
    const year = dateMatch[3] ? parseInt(dateMatch[3]) : now.getFullYear();
    const fullYear = year < 100 ? 2000 + year : year;

    return new Date(fullYear, month, day);
  }

  return undefined;
}

/**
 * Extrai data e hora para eventos (ex: "sex 10h", "18/10 14:30")
 */
function extractDateTime(text: string): Date | undefined {
  const now = new Date();

  // Dias da semana (ex: "sex 10h", "segunda 15h")
  const weekdayMatch = text.match(
    /(seg|ter|qua|qui|sex|sáb|dom|segunda|terça|quarta|quinta|sexta|sábado|domingo)\s+(\d{1,2})(?:h|:(\d{2}))?/i
  );
  if (weekdayMatch) {
    const hour = parseInt(weekdayMatch[2]);
    const minute = weekdayMatch[3] ? parseInt(weekdayMatch[3]) : 0;

    // Simplificação: encontrar o próximo dia da semana
    const targetDate = setMinutes(setHours(startOfDay(addDays(now, 1)), hour), minute);
    return toZonedTime(targetDate, TIMEZONE);
  }

  // Data explícita com hora (ex: "18/10 14:30")
  const dateTimeMatch = text.match(/(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s+(\d{1,2}):(\d{2})/);
  if (dateTimeMatch) {
    const day = parseInt(dateTimeMatch[1]);
    const month = parseInt(dateTimeMatch[2]) - 1;
    const year = dateTimeMatch[3] ? parseInt(dateTimeMatch[3]) : now.getFullYear();
    const hour = parseInt(dateTimeMatch[4]);
    const minute = parseInt(dateTimeMatch[5]);
    const fullYear = year < 100 ? 2000 + year : year;

    const targetDate = new Date(fullYear, month, day, hour, minute);
    return toZonedTime(targetDate, TIMEZONE);
  }

  return undefined;
}

/**
 * Função de compatibilidade - use parseMessage() diretamente
 * @deprecated Use parseMessage() diretamente
 */
export async function parseWithLLM(text: string): Promise<ParsedMessage> {
  console.warn('[parseWithLLM] DEPRECATED: Use parseMessage() diretamente');
  return await parseMessage(text);
}
