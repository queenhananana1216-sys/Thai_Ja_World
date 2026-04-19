# Grab Integration Phasing

## Phase 1: Payment pipeline foundation

- Build card + wallet domain first (orders, attempts, events, ledger).
- Enforce webhook signature verification and idempotency before external launch.
- Keep provider logic behind adapter contracts.

## Phase 2: Grab adapter activation

- Turn on Grab with `PAYMENT_GRABPAY_ENABLED=true`.
- Implement Grab-specific checkout creation in `createProviderCheckout`.
- Implement provider-specific webhook mapping and state transition handlers.

## Phase 3: Growth fallback (if direct payment rollout is delayed)

- Keep adapter interface stable.
- Run reward-first campaign flows:
  - promo code ingestion
  - deep-link tracking
  - wallet credit via controlled ledger entries

## Required controls

- HMAC signature verification per provider
- Unique `(provider, event_id)` constraint for webhook deduplication
- Retry-safe, idempotent event processing workers
- Admin timeline for order and attempt transitions
