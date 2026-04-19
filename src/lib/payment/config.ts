import { PAYMENT_PROVIDERS, type PaymentProvider } from './types';

export function isPaymentProvider(raw: string): raw is PaymentProvider {
  return PAYMENT_PROVIDERS.includes(raw as PaymentProvider);
}

export function requiredWebhookSecret(provider: PaymentProvider): string {
  if (provider === 'card') {
    return process.env.CARD_WEBHOOK_SECRET?.trim() ?? '';
  }
  if (provider === 'grabpay') {
    return process.env.GRABPAY_WEBHOOK_SECRET?.trim() ?? '';
  }
  return process.env.WALLET_WEBHOOK_SECRET?.trim() ?? '';
}

export function isGrabPaymentEnabled(): boolean {
  return process.env.PAYMENT_GRABPAY_ENABLED === 'true';
}
