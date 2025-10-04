import { FastifyPluginAsync } from 'fastify';
import { withUserContext } from '../config/database.js';
import { z } from 'zod';

const createEventSchema = z.object({
  title: z.string(),
  starts_at: z.string().transform((s) => new Date(s)),
  remind_minutes: z.number().default(60),
});

const updateEventSchema = z.object({
  title: z.string().optional(),
  starts_at: z.string().transform((s) => new Date(s)).optional(),
  remind_minutes: z.number().optional(),
});

export const eventRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    request.userId = userId;
  });

  // GET /events
  fastify.get('/', async (request, reply) => {
    const userId = request.userId!;
    const query = request.query as any;

    const from = query.from ? new Date(query.from) : undefined;
    const to = query.to ? new Date(query.to) : undefined;

    return withUserContext(userId, async (client) => {
      let sql = 'SELECT * FROM events WHERE user_id = $1';
      const params: any[] = [userId];

      if (from) {
        params.push(from);
        sql += ` AND starts_at >= $${params.length}`;
      }

      if (to) {
        params.push(to);
        sql += ` AND starts_at <= $${params.length}`;
      }

      sql += ' ORDER BY starts_at ASC';

      const result = await client.query(sql, params);
      return result.rows;
    });
  });

  // POST /events
  fastify.post('/', async (request, reply) => {
    const userId = request.userId!;
    const body = createEventSchema.parse(request.body);

    return withUserContext(userId, async (client) => {
      const result = await client.query(
        `INSERT INTO events (user_id, title, starts_at, remind_minutes)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [userId, body.title, body.starts_at, body.remind_minutes]
      );

      return result.rows[0];
    });
  });

  // PUT /events/:id
  fastify.put('/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };
    const body = updateEventSchema.parse(request.body);

    return withUserContext(userId, async (client) => {
      const updates: string[] = [];
      const values: any[] = [userId, id];

      if (body.title !== undefined) {
        values.push(body.title);
        updates.push(`title = $${values.length}`);
      }

      if (body.starts_at !== undefined) {
        values.push(body.starts_at);
        updates.push(`starts_at = $${values.length}`);
      }

      if (body.remind_minutes !== undefined) {
        values.push(body.remind_minutes);
        updates.push(`remind_minutes = $${values.length}`);
      }

      if (updates.length === 0) {
        return reply.code(400).send({ error: 'No fields to update' });
      }

      const result = await client.query(
        `UPDATE events
         SET ${updates.join(', ')}, updated_at = NOW()
         WHERE user_id = $1 AND id = $2
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Event not found' });
      }

      return result.rows[0];
    });
  });

  // DELETE /events/:id
  fastify.delete('/:id', async (request, reply) => {
    const userId = request.userId!;
    const { id } = request.params as { id: string };

    return withUserContext(userId, async (client) => {
      const result = await client.query(
        'DELETE FROM events WHERE user_id = $1 AND id = $2 RETURNING id',
        [userId, id]
      );

      if (result.rows.length === 0) {
        return reply.code(404).send({ error: 'Event not found' });
      }

      return { deleted: true, id };
    });
  });
};
