import { LLMProvider, ParseContext, LLMResponse } from './types.js';
import { ParsedMessage } from '../../types/index.js';

/**
 * Classe base abstrata para provedores de LLM
 */
export abstract class BaseLLMProvider implements LLMProvider {
  abstract name: string;

  abstract isAvailable(): Promise<boolean>;
  
  abstract callLLM(prompt: string): Promise<LLMResponse>;

  /**
   * Gera prompt estruturado para evitar alucinação
   */
  protected generatePrompt(text: string, context: ParseContext): string {
    return `Você é um parser especializado para um Assessor Financeiro via WhatsApp.
IMPORTANTE: Você deve APENAS analisar mensagens relacionadas ao escopo deste projeto.

ESCOPO DO PROJETO: ${context.projectScope}

INSTRUÇÕES RIGOROSAS:
1. NUNCA invente informações que não estão na mensagem
2. APENAS identifique se a mensagem se encaixa em uma das categorias abaixo
3. Se não souber categorizar, responda type: "unknown"
4. Use apenas as categorias fornecidas
5. Confiança máxima permitida: ${context.maxConfidence}

CATEGORIAS DISPONÍVEIS:
${context.availableCategories.join(', ')}

TIPOS DE MENSAGEM:
- transaction: Gasto ou receita com valor (ex: "gastei 30 reais no almoço")
- query: Pergunta sobre saldos/relatórios (ex: "quanto gastei hoje?")
- event: Agendamento com data/hora (ex: "reunião sexta 10h")
- unknown: Não se encaixa no escopo do projeto

DATA ATUAL: ${context.currentDate.toISOString().split('T')[0]}

MENSAGEM PARA ANALISAR: "${text}"

Responda APENAS com JSON válido no formato:
{
  "type": "transaction|query|event|unknown",
  "confidence": 0.0-${context.maxConfidence},
  "reasoning": "explicação concisa",
  "data": { /* apenas se type for transaction ou event */ }
}`;
  }

  /**
   * Parse da mensagem usando LLM como fallback
   */
  async parseMessage(text: string, context: ParseContext): Promise<ParsedMessage> {
    try {
      const prompt = this.generatePrompt(text, context);
      const response = await this.callLLM(prompt);
      
      return {
        type: response.type,
        confidence: Math.min(response.confidence, context.maxConfidence),
        data: response.data,
        reasoning: response.reasoning
      };
    } catch (error) {
      console.error(`[${this.name}] Erro ao processar mensagem:`, error);
      return {
        type: 'unknown',
        confidence: 0,
        reasoning: 'Erro na comunicação com LLM'
      };
    }
  }

  /**
   * Valida resposta da LLM
   */
  protected validateResponse(response: any): LLMResponse {
    const validTypes = ['transaction', 'query', 'event', 'unknown'];
    
    if (!response || typeof response !== 'object') {
      throw new Error('Resposta inválida da LLM');
    }

    if (!validTypes.includes(response.type)) {
      throw new Error(`Tipo inválido: ${response.type}`);
    }

    if (typeof response.confidence !== 'number' || response.confidence < 0 || response.confidence > 1) {
      throw new Error(`Confiança inválida: ${response.confidence}`);
    }

    return {
      type: response.type,
      confidence: response.confidence,
      reasoning: response.reasoning || '',
      data: response.data
    };
  }
}
