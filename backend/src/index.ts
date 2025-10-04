import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import cookie from '@fastify/cookie';
import { env } from './config/env.js';
import { checkDatabaseConnection } from './config/database.js';
import whatsappRoutes from './routes/whatsapp.js';
import { authRoutes } from './routes/auth.js';
import { transactionRoutes } from './routes/transactions.js';
import { categoryRoutes } from './routes/categories.js';
import { eventRoutes } from './routes/events.js';
import { reportRoutes } from './routes/reports.js';
import { privacyRoutes } from './routes/privacy.js';
import { startCronJobs } from './jobs/index.js';
import { initializeLLMProvider } from './nlp/parser.js';

const fastify = Fastify({
  logger: {
    level: env.NODE_ENV === 'development' ? 'info' : 'warn',
  },
});

// Plugins
await fastify.register(helmet, {
  contentSecurityPolicy: env.NODE_ENV === 'production',
});

await fastify.register(cors, {
  origin: env.NODE_ENV === 'development' ? '*' : ['http://localhost:5173'],
  credentials: true,
});

await fastify.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
});

await fastify.register(cookie);

// Health check
fastify.get('/health', async () => {
  const dbOk = await checkDatabaseConnection();
  return {
    status: dbOk ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    timezone: env.TZ,
  };
});

// Rotas
await fastify.register(whatsappRoutes, { prefix: '/whatsapp' });
await fastify.register(authRoutes, { prefix: '/auth' });
await fastify.register(transactionRoutes, { prefix: '/transactions' });
await fastify.register(categoryRoutes, { prefix: '/categories' });
await fastify.register(eventRoutes, { prefix: '/events' });
await fastify.register(reportRoutes, { prefix: '/reports' });
await fastify.register(privacyRoutes, { prefix: '/privacy' });

// Iniciar servidor
const start = async () => {
  try {
    const port = env.PORT;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`🚀 Server running on http://localhost:${port}`);
    console.log(`🌍 Environment: ${env.NODE_ENV}`);
    console.log(`🕒 Timezone: ${env.TZ}`);

    // Inicializar LLM Provider
    await initializeLLMProvider();
    console.log('🤖 LLM Provider initialized');

    // Iniciar cron jobs
    startCronJobs();
    console.log('⏰ Cron jobs started');
  } catch (err) {
    fastify.log.error(err);
    process.exit(1);
  }
};

start();
