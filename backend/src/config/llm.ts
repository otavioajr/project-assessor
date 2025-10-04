import { LLMConfig } from '../nlp/llm/index.js';

/**
 * Configuração da LLM baseada nas variáveis de ambiente
 */
export function getLLMConfig(): LLMConfig {
  const provider = (process.env.LLM_PROVIDER as 'ollama' | 'openai' | 'disabled') || 'disabled';
  const enabled = process.env.LLM_ENABLED === 'true';

  if (!enabled) {
    return { provider: 'disabled' };
  }

  switch (provider) {
    case 'ollama':
      return {
        provider: 'ollama',
        baseUrl: process.env.LLM_BASE_URL || 'http://localhost:11434',
        model: process.env.LLM_MODEL || 'gemma2:2b',
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '500'),
        temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
      };

    case 'openai':
      return {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        model: process.env.LLM_MODEL || 'gpt-3.5-turbo',
        maxTokens: parseInt(process.env.LLM_MAX_TOKENS || '500'),
        temperature: parseFloat(process.env.LLM_TEMPERATURE || '0.1'),
      };

    default:
      return { provider: 'disabled' };
  }
}

/**
 * Escopo do projeto para contexto da LLM
 */
export const PROJECT_SCOPE = `
Assessor Financeiro via WhatsApp que:
- Registra transações financeiras (gastos e receitas)
- Categoriza automaticamente por: Custos Fixos, Conforto, Liberdade Financeira, 
  Aumentar Renda/Empreender, Prazeres, Metas, Prazeres Futuros, Reserva de Oportunidade
- Agenda eventos e lembretes
- Responde consultas sobre saldo e relatórios
- Funciona através de mensagens de texto simples
`;

/**
 * Categorias disponíveis no sistema
 */
export const AVAILABLE_CATEGORIES = [
  'Custos Fixos',
  'Conforto', 
  'Liberdade Financeira',
  'Aumentar Renda/Empreender',
  'Prazeres',
  'Metas',
  'Prazeres Futuros',
  'Reserva de Oportunidade',
  'Outros'
];
