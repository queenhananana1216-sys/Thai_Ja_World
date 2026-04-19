export const PAYMENT_PROVIDERS = ['card', 'grabpay', 'wallet'] as const;
export type PaymentProvider = (typeof PAYMENT_PROVIDERS)[number];

export const PAYMENT_ORDER_STATUSES = [
  'pending',
  'requires_action',
  'authorized',
  'captured',
  'failed',
  'canceled',
  'refunded',
] as const;
export type PaymentOrderStatus = (typeof PAYMENT_ORDER_STATUSES)[number];

export const PAYMENT_ATTEMPT_STATUSES = [
  'initiated',
  'requires_action',
  'authorized',
  'captured',
  'failed',
  'canceled',
] as const;
export type PaymentAttemptStatus = (typeof PAYMENT_ATTEMPT_STATUSES)[number];

export const WALLET_ENTRY_DIRECTIONS = ['credit', 'debit'] as const;
export type WalletEntryDirection = (typeof WALLET_ENTRY_DIRECTIONS)[number];

export type CreateCheckoutInput = {
  profileId: string;
  provider: PaymentProvider;
  currency: string;
  amountMinor: number;
  orderNo: string;
  idempotencyKey: string;
  metadata?: Record<string, unknown>;
};

export type ProviderCheckoutResult = {
  externalPaymentId: string;
  externalCheckoutUrl?: string;
  nextAction?: 'redirect' | 'none';
};

export type WebhookVerificationResult = {
  ok: boolean;
  eventId?: string;
  reason?: string;
};
