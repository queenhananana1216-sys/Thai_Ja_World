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
} as const;

export type FeatureFlagName = keyof typeof featureFlags;
