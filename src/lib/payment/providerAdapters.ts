import crypto from 'crypto';
import {
  isGrabPaymentEnabled,
  requiredWebhookSecret,
} from './config';
import type {
  CreateCheckoutInput,
  PaymentProvider,
  ProviderCheckoutResult,
  WebhookVerificationResult,
} from './types';

export async function createProviderCheckout(
  input: CreateCheckoutInput,
): Promise<ProviderCheckoutResult> {
  if (input.provider === 'grabpay' && !isGrabPaymentEnabled()) {
    throw new Error('GRABPAY_NOT_ENABLED');
  }

  // 현재는 결제 도메인 골격 단계: 외부 PG SDK 연결 전까지 공통 인터페이스만 고정합니다.
  const suffix = crypto.randomUUID();
  return {
    externalPaymentId: `${input.provider}_${suffix}`,
    nextAction: 'redirect',
    externalCheckoutUrl: `/payments/redirect-placeholder?provider=${input.provider}&order=${encodeURIComponent(input.orderNo)}`,
  };
}

export function verifyProviderWebhook(
  provider: PaymentProvider,
  signature: string,
  rawBody: string,
): WebhookVerificationResult {
  const secret = requiredWebhookSecret(provider);
  if (!secret) {
    return { ok: false, reason: 'MISSING_WEBHOOK_SECRET' };
  }
  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const cleanSig = signature.replace(/^sha256=/i, '').trim();
  if (!cleanSig) {
    return { ok: false, reason: 'MISSING_SIGNATURE' };
  }

  if (digest !== cleanSig) {
    return { ok: false, reason: 'SIGNATURE_MISMATCH' };
  }
  return { ok: true };
}
