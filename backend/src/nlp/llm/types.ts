import { ParsedMessage } from '../../types/index.js';

/**
 * Interface para provedor de LLM pluggable
 */
export interface LLMProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  parseMessage(text: string, context: ParseContext): Promise<ParsedMessage>;
}

/**
 * Contexto fornecido à LLM para evitar alucinação
 */
export interface ParseContext {
  availableCategories: string[];
  currentDate: Date;
  projectScope: string;
  maxConfidence: number;
}

/**
 * Configuração do provedor LLM
 */
export interface LLMConfig {
  provider: 'ollama' | 'openai' | 'disabled';
  baseUrl?: string;
  model?: string;
  apiKey?: string;
  maxTokens?: number;
  temperature?: number;
}

/**
 * Resposta da LLM estruturada
 */
export interface LLMResponse {
  type: 'transaction' | 'query' | 'event' | 'unknown';
  confidence: number;
  reasoning?: string;
  data?: any;
}
