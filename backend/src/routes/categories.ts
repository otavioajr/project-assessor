import { FastifyPluginAsync } from 'fastify';
import { withUserContext } from '../config/database.js';
import { z } from 'zod';

const createCategorySchema = z.object({
  name: z.string(),
  kind: z.enum(['expense', 'income']),
});

const updateCategorySchema = z.object({
  name: z.string().optional(),
});

export const categoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    request.userId = userId;
  });

  // GET /categories
  fastify.get('/', async (request, reply) => {
    const userId = request.userId!;

    return withUserContext(userId, async (client) => {
      const result = await client.query(
        'SELECT * FROM categories WHERE user_id = $1 ORDER BY kind, name',
        [userId]
      );
      return result.rows;
    });
  });

  // POST /categories
  fastify.post('/', async (request, reply) => {
    const userId = request.userId!;
    const body = createCategorySchema.parse(request.body);

    return withUserContext(userId, async (client) => {
      const result = await client.query(
        'INSERT INTO categories (user_id, name, kind) VALUES ($1, $2, $3) RETURNING *',
        [userId, body.name, body.kind]
      );
      return result.rows[0];
    });
  });

  // PUT /categories/:id
  fastify.put('/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };
    const body = updateCategorySchema.parse(request.body);

    return withUserContext(userId, async (client) => {
      // Verificar se é categoria do sistema
      const checkSystem = await client.query(
        'SELECT is_system FROM categories WHERE user_id = $1 AND id = $2',
        [userId, id]
      );

      if (checkSystem.rows.length === 0) {
        return reply.code(404).send({ error: 'Category not found' });
      }

      if (checkSystem.rows[0].is_system) {
        return reply.code(403).send({ error: 'Cannot edit system categories' });
      }

      const result = await client.query(
        'UPDATE categories SET name = $1 WHERE user_id = $2 AND id = $3 RETURNING *',
        [body.name, userId, id]
      );

      return result.rows[0];
    });
  });

  // DELETE /categories/:id
  fastify.delete('/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    return withUserContext(userId, async (client) => {
      // Verificar se é categoria do sistema
      const checkSystem = await client.query(
        'SELECT is_system FROM categories WHERE user_id = $1 AND id = $2',
        [userId, id]
      );

      if (checkSystem.rows.length === 0) {
        return reply.code(404).send({ error: 'Category not found' });
      }

      if (checkSystem.rows[0].is_system) {
        return reply.code(403).send({ error: 'Cannot delete system categories' });
      }

      const result = await client.query(
        'DELETE FROM categories WHERE user_id = $1 AND id = $2 RETURNING id',
        [userId, id]
      );

      return { deleted: true, id };
    });
  });
};
