import { FastifyPluginAsync } from 'fastify';
import { pool } from '../config/database.js';
import { z } from 'zod';

const getUserSchema = z.object({
  userId: z.string().uuid(),
});

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  // Middleware: verificar autenticação (simplificado - usar Supabase Auth no frontend)
  fastify.addHook('preHandler', async (request, reply) => {
    // TODO: Integrar com Supabase Auth
    // Por enquanto, aceitar userId via header (apenas para desenvolvimento)
    const userId = request.headers['x-user-id'] as string;

    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }

    request.userId = userId;
  });

  // GET /auth/me - Obter usuário autenticado
  fastify.get('/me', async (request, reply) => {
    const userId = request.userId;

    const result = await pool.query(
      'SELECT id, wa_number, email, created_at FROM users WHERE id = $1',
      [userId]
    );

    if (result.rows.length === 0) {
      return reply.code(404).send({ error: 'User not found' });
    }

    return result.rows[0];
  });
};

// Estender tipos do Fastify
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}
