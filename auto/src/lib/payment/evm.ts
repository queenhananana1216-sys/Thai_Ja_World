import 'server-only';
import { createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { arbitrum, base, mainnet, polygon } from 'viem/chains';
import type { Chain } from 'viem';
import { appendAudit } from '@/lib/store';

function chainById(id: number): Chain {
  const map: Record<number, Chain> = {
    1: mainnet,
    8453: base,
    42161: arbitrum,
    137: polygon,
  };
  return map[id] ?? mainnet;
}

let lastPaymentMs = 0;

/**
 * 운영용 핫 지갑(AUTO_PAY_SIGNER_PRIVATE_KEY)에서 수취 주소로 네이티브 토큰 전송.
 * 사용자 지갑에서 직접 차감(approve+transferFrom)은 컨트랙트 없이 불가 — 별도 스마트컨트랙트 필요.
 */
export async function sendAutoPaymentIfConfigured(input: {
  reason: string;
  meta?: Record<string, unknown>;
}): Promise<{ ok: true; hash: string } | { ok: false; skipped?: string; error?: string }> {
  if (process.env.AUTO_PAY_ENABLED !== '1') {
    return { ok: false, skipped: 'AUTO_PAY_ENABLED!=1' };
  }

  const pkRaw = process.env.AUTO_PAY_SIGNER_PRIVATE_KEY?.trim();
  const to = process.env.AUTO_PAY_RECIPIENT?.trim();
  const rpc = process.env.AUTO_PAY_RPC_URL?.trim();
  const weiRaw = process.env.AUTO_PAY_AMOUNT_WEI?.trim();
  if (!pkRaw || !to || !rpc || !weiRaw) {
    return { ok: false, skipped: 'missing AUTO_PAY_* env' };
  }

  const cooldown = Math.max(0, Number(process.env.AUTO_PAY_COOLDOWN_MS ?? '300000'));
  if (cooldown > 0 && Date.now() - lastPaymentMs < cooldown) {
    return { ok: false, skipped: 'cooldown' };
  }

  let value: bigint;
  try {
    value = BigInt(weiRaw);
  } catch {
    return { ok: false, error: 'invalid AUTO_PAY_AMOUNT_WEI' };
  }
  if (value <= 0n) return { ok: false, skipped: 'zero amount' };

  const pk = (pkRaw.startsWith('0x') ? pkRaw : `0x${pkRaw}`) as `0x${string}`;
  let account;
  try {
    account = privateKeyToAccount(pk);
  } catch {
    return { ok: false, error: 'invalid private key' };
  }

  const chainId = Number(process.env.AUTO_PAY_CHAIN_ID ?? '1');
  const chain = chainById(Number.isFinite(chainId) ? chainId : 1);

  try {
    const wallet = createWalletClient({
      account,
      chain,
      transport: http(rpc),
    });

    const hash = await wallet.sendTransaction({
      account,
      chain,
      to: to as `0x${string}`,
      value,
    });

    lastPaymentMs = Date.now();
    await appendAudit('auto_payment_sent', { reason: input.reason, hash, chainId: chain.id, ...input.meta });
    return { ok: true, hash };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    await appendAudit('auto_payment_failed', { reason: input.reason, error: msg, ...input.meta });
    return { ok: false, error: msg };
  }
}
