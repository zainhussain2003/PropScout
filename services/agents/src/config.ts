import { config } from 'dotenv';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
config({ path: resolve(here, '..', '..', '..', '.env') });

const REQUIRED_VARS = [
  'TELEGRAM_BOT_TOKEN',
  'TELEGRAM_CHAT_ID',
  'ANTHROPIC_API_KEY',
] as const;

function loadEnv(): {
  telegramBotToken: string;
  telegramChatId: string;
  anthropicApiKey: string;
  supabaseUrl: string;
  supabaseServiceRoleKey: string;
} {
  const missing: string[] = [];
  for (const v of REQUIRED_VARS) {
    const val = process.env[v]?.trim();
    if (!val) missing.push(v);
  }
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}. ` +
      'Set them in the root .env file before running the agent system.'
    );
  }

  return {
    telegramBotToken: process.env.TELEGRAM_BOT_TOKEN!.trim(),
    telegramChatId: process.env.TELEGRAM_CHAT_ID!.trim(),
    anthropicApiKey: process.env.ANTHROPIC_API_KEY!.trim(),
    supabaseUrl: process.env.SUPABASE_URL?.trim() ?? '',
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ?? '',
  };
}

export const ENV = loadEnv();
