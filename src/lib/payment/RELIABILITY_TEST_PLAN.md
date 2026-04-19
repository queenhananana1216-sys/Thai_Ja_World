# Payment and Board Reliability Test Plan

## A. Board segmentation regression checks

1. `GET /community/boards` (without `cat`) returns only general categories:
   - `free`, `restaurant`, `info`
2. `GET /community/boards?scope=trade` returns only:
   - `flea`, `job`
3. `GET /community/boards/new?scope=trade` shows only trade category options.
4. `POST /api/community/posts` rejects scope/category mismatches.

## B. Payment idempotency checks

1. Reuse same `idempotencyKey` in checkout request:
   - verify only one order is persisted (when persistence wiring is completed).
2. Replay same webhook `event_id`:
   - verify `payment_events` unique constraint prevents duplicate processing.

## C. State transition checks

Validate status transitions for both order and attempt entities:

- initiated -> requires_action -> authorized -> captured
- initiated -> failed
- authorized -> canceled
- captured -> refunded

Transitions must reject invalid backflow (for example, `captured -> pending`).

## D. Observability checks

- Every checkout and webhook call logs:
  - `provider`
  - `orderNo` or `externalPaymentId`
  - transition source and target status
  - error code (if failed)
- Admin view can sort and filter by:
  - provider
  - status
  - created_at range
