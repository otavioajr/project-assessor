import { FastifyRequest, FastifyReply } from 'fastify';

/**
 * Middleware de autenticação simplificado
 * TODO: Substituir por Supabase Auth em produção
 */
export async function authenticate(request: FastifyRequest, reply: FastifyReply) {
  const userId = request.headers['x-user-id'] as string;

  if (!userId) {
    return reply.code(401).send({
      error: 'Unauthorized',
      message: 'x-user-id header is required',
    });
  }

  // Validar formato UUID
  const uuidRegex =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(userId)) {
    return reply.code(400).send({
      error: 'Bad Request',
      message: 'Invalid user ID format',
    });
  }

  // Adicionar userId ao request
  request.userId = userId;
}

// Estender tipos do Fastify (já declarado em auth.ts, mas repetindo aqui para clareza)
declare module 'fastify' {
  interface FastifyRequest {
    userId?: string;
  }
}
