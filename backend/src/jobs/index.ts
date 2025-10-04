import cron from 'node-cron';
import { sendEventReminders } from './reminders.js';
import { sendDailySummary } from './summaries.js';

export function startCronJobs() {
  // Verificar lembretes de eventos a cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    console.log('⏰ [Cron] Checking event reminders...');
    try {
      await sendEventReminders();
    } catch (error) {
      console.error('❌ [Cron] Error sending reminders:', error);
    }
  });

  // Enviar resumo diário às 20h (horário de Brasília)
  cron.schedule(
    '0 20 * * *',
    async () => {
      console.log('📊 [Cron] Sending daily summaries...');
      try {
        await sendDailySummary();
      } catch (error) {
        console.error('❌ [Cron] Error sending summaries:', error);
      }
    },
    {
      timezone: 'America/Sao_Paulo',
    }
  );

  console.log('✅ Cron jobs registered');
}
