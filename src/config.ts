import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  OPENAI_API_KEY: z.string().min(1, 'Renseigner OPENAI_API_KEY dans .env'),
  OPENAI_MODEL: z.string().min(1).default('gpt-6-astra'),
  OPENAI_REASONING_EFFORT: z.enum(['low', 'medium', 'high', 'xhigh', 'max']).default('low'),
  SLACK_BOT_TOKEN: z.string().startsWith('xoxb-'),
  SLACK_APP_TOKEN: z.string().startsWith('xapp-'),
  SLACK_TEAM_ID: z.string().regex(/^T[A-Z0-9]+$/),
  SLACK_TIMEZONE_USER_ID: z.string().regex(/^[UW][A-Z0-9]+$/),
  REPORT_TIMEZONE: z.string().optional(),
  DATABASE_PATH: z.string().default('./data/modulo.sqlite'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  EDUCATION_BASE_URL: z.url().refine(value => {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password && !url.search && !url.hash;
  }, 'Utiliser une URL HTTPS sans identifiants, paramètres ni fragment'),
  MODULO_ENABLED: z.literal('true', 'Définir MODULO_ENABLED=true pour activer Modulo'),
});
export function readConfig(env: NodeJS.ProcessEnv = process.env) {
  const result = envSchema.safeParse(env);
  if (!result.success) {
    // Do not print submitted values: they include credentials.
    throw new Error('Configuration incomplète : ' + result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join('; '));
  }
  return result.data;
}
export type Config = ReturnType<typeof readConfig>;
