import { LLMProvider, ParseContext } from './types.js';
import { ParsedMessage } from '../../types/index.js';

/**
 * Provedor desabilitado - sempre retorna unknown
 */
export class DisabledLLMProvider implements LLMProvider {
  name = 'Disabled';

  async isAvailable(): Promise<boolean> {
    return true; // Sempre "disponível" mas não faz nada
  }

  async parseMessage(text: string, context: ParseContext): Promise<ParsedMessage> {
    console.log('[LLM] Desabilitado - retornando unknown para:', text.substring(0, 50));
    return {
      type: 'unknown',
      confidence: 0,
      reasoning: 'LLM desabilitada'
    };
  }
}
