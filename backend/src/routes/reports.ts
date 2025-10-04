import { FastifyPluginAsync } from 'fastify';
import { withUserContext } from '../config/database.js';
import { startOfMonth, endOfMonth } from 'date-fns';

export const reportRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    request.userId = userId;
  });

  // GET /reports/summary - Resumo financeiro
  fastify.get('/summary', async (request, reply) => {
    const userId = request.userId!;
    const query = request.query as any;

    const from = query.from ? new Date(query.from) : startOfMonth(new Date());
    const to = query.to ? new Date(query.to) : endOfMonth(new Date());

    return withUserContext(userId, async (client) => {
      // Totais - Considerar transações sem categoria como despesas
      const totalsResult = await client.query(
        `SELECT
          COALESCE(SUM(CASE WHEN c.kind = 'income' THEN t.amount ELSE 0 END), 0) as total_income,
          COALESCE(SUM(CASE WHEN c.kind = 'expense' OR c.kind IS NULL THEN t.amount ELSE 0 END), 0) as total_expense,
          COUNT(DISTINCT t.id) as total_transactions
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1
          AND t.occurred_at >= $2
          AND t.occurred_at <= $3`,
        [userId, from, to]
      );

      const totals = totalsResult.rows[0];
      const balance = parseFloat(totals.total_income) - parseFloat(totals.total_expense);

      // Por categoria (incluindo transações sem categoria)
      const byCategoryResult = await client.query(
        `SELECT
          COALESCE(c.name, 'Sem categoria') as category,
          COALESCE(c.kind, 'expense') as kind,
          SUM(t.amount) as total,
          COUNT(t.id) as count
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1
          AND t.occurred_at >= $2
          AND t.occurred_at <= $3
        GROUP BY c.name, c.kind
        ORDER BY total DESC`,
        [userId, from, to]
      );

      return {
        period: { from, to },
        totals: {
          income: parseFloat(totals.total_income),
          expense: parseFloat(totals.total_expense),
          balance,
          transactions: parseInt(totals.total_transactions),
        },
        byCategory: byCategoryResult.rows.map((r) => ({
          category: r.category || 'Sem categoria',
          kind: r.kind,
          total: parseFloat(r.total),
          count: parseInt(r.count),
        })),
      };
    });
  });

  // GET /reports/monthly - Comparação mensal
  fastify.get('/monthly', async (request, reply) => {
    const userId = request.userId!;

    return withUserContext(userId, async (client) => {
      const result = await client.query(
        `SELECT
          DATE_TRUNC('month', occurred_at) as month,
          SUM(CASE WHEN c.kind = 'income' THEN amount ELSE 0 END) as income,
          SUM(CASE WHEN c.kind = 'expense' OR c.kind IS NULL THEN amount ELSE 0 END) as expense
        FROM transactions t
        LEFT JOIN categories c ON t.category_id = c.id
        WHERE t.user_id = $1
        GROUP BY DATE_TRUNC('month', occurred_at)
        ORDER BY month DESC
        LIMIT 12`,
        [userId]
      );

      return result.rows.map((r) => ({
        month: r.month,
        income: parseFloat(r.income),
        expense: parseFloat(r.expense),
        balance: parseFloat(r.income) - parseFloat(r.expense),
      }));
    });
  });
};
