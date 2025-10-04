import { pool } from '../config/database.js';
import { startOfDay, endOfDay } from 'date-fns';
import axios from 'axios';
import { env } from '../config/env.js';

/**
 * Envia resumo diário para usuários ativos
 */
export async function sendDailySummary() {
  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);

  // Buscar usuários que tiveram transações hoje
  const usersResult = await pool.query(
    `SELECT DISTINCT u.id, u.wa_number
     FROM users u
     JOIN transactions t ON t.user_id = u.id
     WHERE t.occurred_at >= $1
       AND t.occurred_at <= $2`,
    [start, end]
  );

  for (const user of usersResult.rows) {
    try {
      const summary = await getUserDailySummary(user.id);
      await sendWhatsAppMessage(user.wa_number, summary);
      console.log(`✅ Daily summary sent to ${user.wa_number}`);
    } catch (error) {
      console.error(`❌ Failed to send summary to ${user.wa_number}:`, error);
    }
  }
}

async function getUserDailySummary(userId: string): Promise<string> {
  const today = new Date();
  const start = startOfDay(today);
  const end = endOfDay(today);

  const result = await pool.query(
    `SELECT
      COUNT(*) as count,
      COALESCE(SUM(CASE WHEN c.kind = 'income' THEN t.amount ELSE 0 END), 0) as income,
      COALESCE(SUM(CASE WHEN c.kind = 'expense' THEN t.amount ELSE 0 END), 0) as expense
    FROM transactions t
    LEFT JOIN categories c ON t.category_id = c.id
    WHERE t.user_id = $1
      AND t.occurred_at >= $2
      AND t.occurred_at <= $3`,
    [userId, start, end]
  );

  const { count, income, expense } = result.rows[0];
  const balance = parseFloat(income) - parseFloat(expense);

  return `📊 Resumo de hoje:\n💰 Receitas: R$ ${parseFloat(income).toFixed(2)}\n💸 Despesas: R$ ${parseFloat(expense).toFixed(2)}\n📈 Saldo: R$ ${balance.toFixed(2)}\n🔢 ${count} transação(ões)`;
}

async function sendWhatsAppMessage(to: string, message: string) {
  // Verificar se WhatsApp está configurado (não é token de dev)
  if (env.WA_ACCESS_TOKEN.startsWith('dev-')) {
    console.log(`📱 [DEV MODE] Would send WhatsApp to ${to}:\n${message}`);
    return; // Não tenta enviar em modo dev
  }

  await axios.post(
    `https://graph.facebook.com/v18.0/${env.WA_PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to,
      text: { body: message },
    },
    {
      headers: {
        Authorization: `Bearer ${env.WA_ACCESS_TOKEN}`,
        'Content-Type': 'application/json',
      },
    }
  );
}
