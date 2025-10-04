import { FastifyPluginAsync } from 'fastify';
import { withUserContext } from '../config/database.js';
import { z } from 'zod';

const createTransactionSchema = z.object({
  amount: z.number(),
  category_id: z.number().optional(),
  occurred_at: z.string().transform((s) => new Date(s)),
  note: z.string().optional(),
});

const updateTransactionSchema = z.object({
  amount: z.number().optional(),
  category_id: z.number().optional(),
  occurred_at: z.string().transform((s) => new Date(s)).optional(),
  note: z.string().optional(),
});

export const transactionRoutes: FastifyPluginAsync = async (fastify) => {
  // Middleware: verificar autenticação
  fastify.addHook('preHandler', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    request.userId = userId;
  });

  // GET /transactions - Listar transações
  fastify.get('/', async (request, reply) => {
    const userId = request.userId!;
    const query = request.query as any;

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    return withUserContext(userId, async (client) => {
      let sql = `
        SELECT t.*, c.name as category_name, c.kind as category_kind
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1
      `;

      const params: any[] = [userId];

      if (from) {
        params.push(from);
        sql += ` AND t.occurred_at >= $${params.length}`;
      }

      if (to) {
        params.push(to);
        sql += ` AND t.occurred_at <= $${params.length}`;
      }

      sql += ' ORDER BY t.occurred_at DESC, t.created_at DESC';

      const result = await client.query(sql, params);
      return result.rows;
    });
  });

  // POST /transactions - Criar transação
  fastify.post('/', async (request, reply) => {
    const userId = request.userId!;
    const body = createTransactionSchema.parse(request.body);

    return withUserContext(userId, async (client) => {
      const result = await client.query(
        `INSERT INTO transactions (user_id, amount, category_id, occurred_at, note)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING *`,
        [userId, body.amount, body.category_id, body.occurred_at, body.note]
      );

      // Audit log
      await client.query(
        `INSERT INTO audit_logs (user_id, action, meta)
         VALUES ($1, 'create_transaction', $2)`,
        [userId, JSON.stringify({ transaction_id: result.rows[0].id })]
      );

      return result.rows[0];
    });
  });

  // PUT /transactions/:id - Atualizar transação
  fastify.put('/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };
    const body = updateTransactionSchema.parse(request.body);

    return withUserContext(userId, async (client) => {
      const updates: string[] = [];
      const values: any[] = [userId, id];

      if (body.amount !== undefined) {
        values.push(body.amount);
        updates.push(`amount = $${values.length}`);
      }

      if (body.category_id !== undefined) {
        values.push(body.category_id);
        updates.push(`category_id = $${values.length}`);
      }

      if (body.occurred_at !== undefined) {
        values.push(body.occurred_at);
        updates.push(`occurred_at = $${values.length}`);
      }

      if (body.note !== undefined) {
        values.push(body.note);
        updates.push(`note = $${values.length}`);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }

      const result = await client.query(
        `UPDATE transactions
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE user_id = $1 AND id = $2
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Transaction not found' });
      }

      return result.rows[0];
    });
  });

  // DELETE /transactions/:id - Excluir transação
  fastify.delete('/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    return withUserContext(userId, async (client) => {
      const result = await client.query(
        'DELETE FROM transactions WHERE user_id = $1 AND id = $2 RETURNING id',
        [userId, id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Transaction not found' });
      }

      return { deleted: true, id };
    });
  });
};
