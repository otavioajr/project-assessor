import { describe, it, expect } from 'vitest';
import { parseMessage } from '../nlp/parser';

describe('Parser NLP', () => {
  describe('Transações', () => {
    it('deve extrair valor e categoria corretamente', async () => {
      const result = await parseMessage('mercado 52,30 hoje');

      expect(result.type).toBe('transaction');
      expect(result.data?.amount).toBe(52.3);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('deve extrair valor com R$', async () => {
      const result = await parseMessage('uber R$ 25,50');

      expect(result.type).toBe('transaction');
      expect(result.data?.amount).toBe(25.5);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it('deve reconhecer datas relativas', async () => {
      const result = await parseMessage('farmácia 45 ontem');

      expect(result.type).toBe('transaction');
      expect(result.data?.amount).toBe(45);
      expect(result.data?.date).toBeInstanceOf(Date);
    });
  });

  describe('Eventos', () => {
    it('deve reconhecer evento com dia da semana e hora', async () => {
      const result = await parseMessage('dentista sex 10h');

      expect(result.type).toBe('event');
      expect(result.data?.eventTitle).toContain('dentista');
      expect(result.data?.eventTime).toBeInstanceOf(Date);
      expect(result.confidence).toBeGreaterThan(0.5);
    });
  });

  describe('Queries', () => {
    it('deve reconhecer consulta de saldo', async () => {
      const result = await parseMessage('saldo do mês');

      expect(result.type).toBe('query');
    });

    it('deve reconhecer consulta de gastos', async () => {
      const result = await parseMessage('quanto gastei esse mês?');

      expect(result.type).toBe('query');
    });
  });

  describe('Mensagens desconhecidas', () => {
    it('deve retornar unknown para mensagens não reconhecidas', async () => {
      const result = await parseMessage('olá como vai?');

      expect(result.type).toBe('unknown');
      expect(result.confidence).toBe(0);
    });
  });
});
