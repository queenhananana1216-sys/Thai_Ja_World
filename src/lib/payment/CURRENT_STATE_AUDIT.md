# Thai Ja World Payment Current State Audit

## Findings

1. No production payment SDK is wired in application dependencies.
2. Current purchase flow uses internal style points:
   - `app/minihome/_components/MinihomeStyleShopClient.tsx` calls `style_purchase_item`.
   - `supabase/migrations/049_style_points_minihome_shop.sql` updates `profiles.style_score_total`.
3. There is no cash wallet ledger domain yet.
4. There is no Grab payment integration code yet.

## Gap Summary

- International card payments: not implemented
- GrabPay payments: not implemented
- Coin wallet ledger domain: not implemented
- Webhook idempotency event store: not implemented

## Implemented in this change

- Payment domain schema foundation: `supabase/migrations/057_payment_domain_foundation.sql`
- Payment API skeleton:
  - `app/api/payments/checkout/route.ts`
  - `app/api/payments/webhooks/[provider]/route.ts`
- Provider adapter + webhook signature verification skeleton:
  - `src/lib/payment/providerAdapters.ts`
