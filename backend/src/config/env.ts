import { config } from 'dotenv';
import { z } from 'zod';

config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default('3001'),
  DATABASE_URL: z.string(),
  JWT_SECRET: z.string(),
  TZ: z.string().default('America/Sao_Paulo'),

  // WhatsApp
  WA_VERIFY_TOKEN: z.string(),
  WA_ACCESS_TOKEN: z.string(),
  WA_PHONE_NUMBER_ID: z.string(),

  // LLM (opcional)
  LLM_ENABLED: z
    .string()
    .transform((v) => v === 'true')
    .default('false'),
  LLM_PROVIDER: z.enum(['ollama', 'openai', 'disabled']).default('disabled'),
  LLM_BASE_URL: z.string().optional(),
  LLM_MODEL: z.string().optional(),
  LLM_MAX_TOKENS: z.string().transform(Number).optional(),
  LLM_TEMPERATURE: z.string().transform(Number).optional(),
  OPENAI_API_KEY: z.string().optional(),

  // Supabase
  SUPABASE_URL: z.string(),
  SUPABASE_SERVICE_KEY: z.string(),
});

export type Env = z.infer<typeof envSchema>;

export const env = envSchema.parse(process.env);
