import { FastifyPluginAsync } from 'fastify';
import { withUserContext, pool } from '../config/database.js';
import { stringify } from 'csv-stringify/sync';
import PDFDocument from 'pdfkit';

export const privacyRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook('preHandler', async (request, reply) => {
    const userId = request.headers['x-user-id'] as string;
    if (!userId) {
      return reply.code(401).send({ error: 'Unauthorized' });
    }
    request.userId = userId;
  });

  // POST /privacy/export - Exportar todos os dados do usuário (LGPD)
  fastify.post('/export', async (request, reply) => {
    const userId = request.userId!;
    const format = (request.body as any)?.format || 'csv'; // csv | pdf

    return withUserContext(userId, async (client) => {
      // Buscar todos os dados
      const user = await client.query('SELECT * FROM users WHERE id = $1', [userId]);
      const transactions = await client.query(
        `SELECT t.*, c.name as category_name FROM transactions t
         LEFT JOIN categories c ON t.category_id = c.id
         WHERE t.user_id = $1
         ORDER BY t.occurred_at DESC`,
        [userId]
      );
      const events = await client.query(
        'SELECT * FROM events WHERE user_id = $1 ORDER BY starts_at DESC',
        [userId]
      );
      const categories = await client.query('SELECT * FROM categories WHERE user_id = $1', [
        userId,
      ]);

      // Registrar auditoria
      await client.query(
        `INSERT INTO audit_logs (user_id, action, meta)
         VALUES ($1, 'export', $2)`,
        [userId, JSON.stringify({ format, timestamp: new Date() })]
      );

      if (format === 'csv') {
        const csv = stringify(transactions.rows, { header: true });
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', 'attachment; filename="meus-dados.csv"');
        return csv;
      } else if (format === 'pdf') {
        const doc = new PDFDocument();
        const chunks: Buffer[] = [];

        doc.on('data', (chunk) => chunks.push(chunk));
        doc.on('end', () => {
          const pdfBuffer = Buffer.concat(chunks);
          reply.header('Content-Type', 'application/pdf');
          reply.header('Content-Disposition', 'attachment; filename="meus-dados.pdf"');
          reply.send(pdfBuffer);
        });

        doc.fontSize(18).text('Meus Dados - LGPD', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12).text(`Usuário: ${user.rows[0].wa_number}`);
        doc.text(`Data: ${new Date().toLocaleDateString('pt-BR')}`);
        doc.moveDown();

        doc.fontSize(14).text('Transações:', { underline: true });
        transactions.rows.forEach((t) => {
          doc
            .fontSize(10)
            .text(
              `${t.occurred_at.toLocaleDateString('pt-BR')} - ${t.category_name || 'N/A'}: R$ ${t.amount}`
            );
        });

        doc.end();
      } else {
        return reply.code(400).send({ error: 'Invalid format' });
      }
    });
  });

  // POST /privacy/delete - Solicitar exclusão (passo 1)
  fastify.post('/delete', async (request, reply) => {
    const userId = request.userId!;

    // Retornar token de confirmação (simplificado)
    const token = Buffer.from(`${userId}-${Date.now()}`).toString('base64');

    return { message: 'Confirme a exclusão usando o token', token };
  });

  // POST /privacy/delete/confirm - Confirmar exclusão (passo 2)
  fastify.post('/delete/confirm', async (request, reply) => {
    const userId = request.userId!;
    const { token } = request.body as { token: string };

    // Validar token (simplificado)
    const decoded = Buffer.from(token, 'base64').toString();
    if (!decoded.startsWith(userId)) {
      return reply.code(400).send({ error: 'Invalid token' });
    }

    // Executar exclusão
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Audit log ANTES de deletar
      await client.query(
        `INSERT INTO audit_logs (user_id, action, meta)
         VALUES ($1, 'delete', $2)`,
        [userId, JSON.stringify({ timestamp: new Date() })]
      );

      // Deletar usuário (cascade vai deletar tudo)
      await client.query('DELETE FROM users WHERE id = $1', [userId]);

      await client.query('COMMIT');

      return { message: 'Dados excluídos com sucesso' };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  });
};
