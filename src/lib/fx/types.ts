export type FxCurrency = 'THB' | 'KRW' | 'USD';

export type FxSnapshot = {
  /** 1 USD = usdToThb THB */
  usdToThb: number;
  /** 1 USD = usdToKrw KRW */
  usdToKrw: number;
  dateISO: string;
  /** API 실패 시 예시 환율 */
  mock: boolean;
};
