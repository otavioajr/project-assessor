import { FastifyError, FastifyReply, FastifyRequest } from 'fastify';

/**
 * Handler global de erros
 */
export async function errorHandler(
  error: FastifyError,
  request: FastifyRequest,
  reply: FastifyReply
) {
  // Log do erro
  request.log.error(error);

  // Erros de validação (Zod, etc.)
  if (error.validation) {
    return reply.code(400).send({
      error: 'Validation Error',
      message: 'Invalid request data',
      details: error.validation,
    });
  }

  // Erros do Postgres
  if (error.code?.startsWith('23')) {
    // 23xxx = violação de constraint
    return reply.code(409).send({
      error: 'Database Constraint Violation',
      message: 'The operation violates a database constraint',
    });
  }

  // Erro 404
  if (error.statusCode === 404) {
    return reply.code(404).send({
      error: 'Not Found',
      message: error.message || 'Resource not found',
    });
  }

  // Erro 401/403
  if (error.statusCode === 401 || error.statusCode === 403) {
    return reply.code(error.statusCode).send({
      error: error.statusCode === 401 ? 'Unauthorized' : 'Forbidden',
      message: error.message,
    });
  }

  // Erro genérico 500
  return reply.code(500).send({
    error: 'Internal Server Error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'An error occurred',
  });
}
