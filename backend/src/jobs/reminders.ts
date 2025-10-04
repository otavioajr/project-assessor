import { pool } from '../config/database.js';
import { addMinutes } from 'date-fns';
import axios from 'axios';
import { env } from '../config/env.js';

/**
 * Envia lembretes de eventos próximos
 */
export async function sendEventReminders() {
  const now = new Date();
  const lookAhead = addMinutes(now, 10); // Próximos 10 minutos

  const result = await pool.query(
    `SELECT e.*, u.wa_number
     FROM events e
     JOIN users u ON e.user_id = u.id
     WHERE e.starts_at >= $1
       AND e.starts_at <= $2
       AND e.reminded_at IS NULL
     ORDER BY e.starts_at ASC`,
    [now, lookAhead]
  );

  for (const event of result.rows) {
    const minutesUntil = Math.round(
      (new Date(event.starts_at).getTime() - now.getTime()) / 60000
    );

    const message = `⏰ Lembrete: "${event.title}" começa em ${minutesUntil} minuto(s)!`;

    try {
      await sendWhatsAppMessage(event.wa_number, message);

      // Marcar como enviado
      await pool.query('UPDATE events SET reminded_at = NOW() WHERE id = $1', [event.id]);

      console.log(`✅ Reminder sent for event ${event.id}`);
    } catch (error) {
      console.error(`❌ Failed to send reminder for event ${event.id}:`, error);
    }
  }
}

async function sendWhatsAppMessage(to: string, message: string) {
  // Verificar se WhatsApp está configurado (não é token de dev)
  if (env.WA_ACCESS_TOKEN.startsWith('dev-')) {
    console.log(`📱 [DEV MODE] Would send WhatsApp to ${to}: ${message}`);
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
