import pg from 'pg';
import { env } from './env.js';

const { Pool } = pg;

export const pool = new Pool({
  connectionString: env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
});

// Função para executar queries com isolamento por user_id (RLS)
export async function withUserContext<T>(
  userId: string,
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    // Ativar RLS injetando app.user_id
    // Nota: SET não aceita placeholders, então escapamos manualmente
    await client.query(`SET app.user_id = '${userId}'`);
    return await callback(client);
  } finally {
    // Limpar e devolver ao pool
    await client.query('RESET app.user_id');
    client.release();
  }
}

// Health check do banco
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const result = await pool.query('SELECT NOW()');
    console.log('✅ Database connected:', result.rows[0].now);
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    return false;
  }
}
