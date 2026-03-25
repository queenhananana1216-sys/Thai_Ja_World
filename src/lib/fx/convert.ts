import type { FxCurrency } from '@/lib/fx/types';

export function amountToUsd(
  amount: number,
  from: FxCurrency,
  usdToThb: number,
  usdToKrw: number,
): number {
  if (!Number.isFinite(amount)) return 0;
  switch (from) {
    case 'USD':
      return amount;
    case 'THB':
      return usdToThb > 0 ? amount / usdToThb : 0;
    case 'KRW':
      return usdToKrw > 0 ? amount / usdToKrw : 0;
    default:
      return 0;
  }
}

export function usdToCurrency(
  usd: number,
  to: FxCurrency,
  usdToThb: number,
  usdToKrw: number,
): number {
  switch (to) {
    case 'USD':
      return usd;
    case 'THB':
      return usd * usdToThb;
    case 'KRW':
      return usd * usdToKrw;
    default:
      return 0;
  }
}

export function formatFxAmount(value: number, c: FxCurrency): string {
  if (!Number.isFinite(value)) return '—';
  if (c === 'KRW') {
    return `${Math.round(value).toLocaleString()} ₩`;
  }
  if (c === 'THB') {
    return `${value.toFixed(2)} ฿`;
  }
  return `${value.toFixed(2)} $`;
}
