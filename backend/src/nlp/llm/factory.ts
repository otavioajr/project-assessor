import { LLMProvider, LLMConfig } from './types.js';
import { OllamaProvider } from './ollama-provider.js';
import { DisabledLLMProvider } from './disabled-provider.js';

/**
 * Factory para criar provedores de LLM
 */
export class LLMProviderFactory {
  /**
   * Cria um provedor baseado na configuração
   */
  static create(config: LLMConfig): LLMProvider {
    switch (config.provider) {
      case 'ollama':
        return new OllamaProvider(config);
      
      case 'disabled':
      default:
        return new DisabledLLMProvider();
    }
  }

  /**
   * Cria e testa disponibilidade do provedor
   */
  static async createAndTest(config: LLMConfig): Promise<LLMProvider> {
    const provider = this.create(config);
    
    try {
      const isAvailable = await provider.isAvailable();
      if (!isAvailable && config.provider !== 'disabled') {
        console.warn(`[LLM] Provider ${config.provider} não disponível, usando fallback`);
        return new DisabledLLMProvider();
      }
      
      return provider;
    } catch (error) {
      console.error(`[LLM] Erro ao testar provider ${config.provider}:`, error);
      return new DisabledLLMProvider();
    }
  }
}
