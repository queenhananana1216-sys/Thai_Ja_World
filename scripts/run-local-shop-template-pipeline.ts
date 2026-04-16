import { config as loadEnv } from 'dotenv';
import { runLocalShopTemplatePipeline } from '../src/lib/localShopTemplates/pipeline';

loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

function parseLimit(argv: string[]): number {
  const raw = argv.find((arg) => arg.startsWith('--limit='))?.split('=')[1];
  const n = Number(raw ?? '12');
  if (!Number.isFinite(n)) return 12;
  return Math.max(1, Math.min(50, Math.floor(n)));
}

async function main() {
  const limit = parseLimit(process.argv.slice(2));
  console.log(`[local-shop-template] start (limit=${limit})`);
  const result = await runLocalShopTemplatePipeline(limit);
  console.log('[local-shop-template] result:', result);
}

void main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error('[local-shop-template] failed:', message);
  process.exitCode = 1;
});
