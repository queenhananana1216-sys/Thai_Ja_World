function envBool(value: string | undefined, defaultValue = false): boolean {
  const raw = value?.trim().toLowerCase();
  if (!raw) return defaultValue;
  return raw === '1' || raw === 'true' || raw === 'yes' || raw === 'on';
}

export const featureFlags = {
  engagementNavV1: envBool(process.env.NEXT_PUBLIC_FF_ENGAGEMENT_NAV_V1, true),
  mobileNavDrawerV1: envBool(process.env.NEXT_PUBLIC_FF_MOBILE_NAV_DRAWER_V1, true),
  phoneApiBridgeV1: envBool(process.env.NEXT_PUBLIC_FF_PHONE_API_BRIDGE_V1, false),
  twilioVerifyV1: envBool(process.env.FF_TWILIO_VERIFY_V1, false),
  ordersDeliveryV1: envBool(process.env.NEXT_PUBLIC_FF_ORDERS_DELIVERY_V1, false),
  paymentsV1: envBool(process.env.NEXT_PUBLIC_FF_PAYMENTS_V1, false),
  cryptoPaymentsV1: envBool(process.env.NEXT_PUBLIC_FF_CRYPTO_PAYMENTS_V1, false),
  /** 소비자 프리미엄 월 구독(Stripe Checkout). 테스트 시 기본 on — 프로덕션에서 끄려면 false */
  premiumSubscriptionsV1: envBool(process.env.NEXT_PUBLIC_FF_PREMIUM_SUBSCRIPTIONS_V1, true),
} as const;

export type FeatureFlagName = keyof typeof featureFlags;
