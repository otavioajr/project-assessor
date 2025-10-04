import { BaseLLMProvider } from './base-provider.js';
import { LLMConfig, LLMResponse } from './types.js';
import axios, { AxiosInstance } from 'axios';

/**
 * Provedor Ollama para LLM local
 */
export class OllamaProvider extends BaseLLMProvider {
  name = 'Ollama';
  private client: AxiosInstance;
  private config: LLMConfig;

  constructor(config: LLMConfig) {
    super();
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl || 'http://localhost:11434',
      timeout: 30000, // 30 segundos
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Verifica se Ollama está disponível e o modelo está carregado
   */
  async isAvailable(): Promise<boolean> {
    try {
      // Verificar se Ollama está rodando
      const healthResponse = await this.client.get('/api/version');
      if (healthResponse.status !== 200) {
        return false;
      }

      // Verificar se o modelo está disponível
      const modelsResponse = await this.client.get('/api/tags');
      const models = modelsResponse.data?.models || [];
      const modelExists = models.some((model: any) => 
        model.name === this.config.model || 
        model.name.startsWith(this.config.model?.split(':')[0] || '')
      );

      if (!modelExists) {
        console.warn(`[Ollama] Modelo ${this.config.model} não encontrado. Modelos disponíveis:`, 
          models.map((m: any) => m.name));
        return false;
      }

      console.log(`[Ollama] ✅ Disponível com modelo ${this.config.model}`);
      return true;
    } catch (error) {
      console.warn('[Ollama] ❌ Não disponível:', (error as Error).message);
      return false;
    }
  }

  /**
   * Chama a API do Ollama
   */
  async callLLM(prompt: string): Promise<LLMResponse> {
    try {
      const payload = {
        model: this.config.model || 'gemma:2b',
        prompt,
        stream: false,
        options: {
          temperature: this.config.temperature || 0.1, // Baixa temperatura para consistência
          top_p: 0.9,
          top_k: 40,
          num_predict: this.config.maxTokens || 500,
        },
      };

      console.log(`[Ollama] Enviando prompt para ${this.config.model}...`);
      const response = await this.client.post('/api/generate', payload);
      
      if (!response.data?.response) {
        throw new Error('Resposta vazia do Ollama');
      }

      const rawResponse = response.data.response.trim();
      console.log('[Ollama] Resposta bruta:', rawResponse.substring(0, 200) + '...');

      // Tentar extrair JSON da resposta
      const jsonMatch = rawResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('Resposta não contém JSON válido');
      }

      const jsonResponse = JSON.parse(jsonMatch[0]);
      return this.validateResponse(jsonResponse);

    } catch (error) {
      console.error('[Ollama] Erro na requisição:', error);
      throw new Error(`Erro ao comunicar com Ollama: ${(error as Error).message}`);
    }
  }

  /**
   * Carrega modelo se não estiver carregado
   */
  async ensureModelLoaded(): Promise<void> {
    try {
      console.log(`[Ollama] Verificando modelo ${this.config.model}...`);
      
      // Tentar uma geração simples para carregar o modelo
      await this.client.post('/api/generate', {
        model: this.config.model,
        prompt: 'test',
        stream: false,
        options: { num_predict: 1 }
      });

      console.log(`[Ollama] ✅ Modelo ${this.config.model} carregado`);
    } catch (error) {
      console.error(`[Ollama] ❌ Erro ao carregar modelo ${this.config.model}:`, error);
      throw new Error(`Modelo ${this.config.model} não pôde ser carregado`);
    }
  }

  /**
   * Lista modelos disponíveis
   */
  async listAvailableModels(): Promise<string[]> {
    try {
      const response = await this.client.get('/api/tags');
      return response.data?.models?.map((model: any) => model.name) || [];
    } catch (error) {
      console.error('[Ollama] Erro ao listar modelos:', error);
      return [];
    }
  }
}
