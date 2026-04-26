-- 069_order_payment_intents_update_policy.sql
-- Allow checkout retries to update existing payment intent rows.

drop policy if exists order_payment_intents_update_by_order_actor on public.order_payment_intents;
create policy order_payment_intents_update_by_order_actor
  on public.order_payment_intents
  for update
  to authenticated
  using (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and (
          o.customer_id = auth.uid()
          or exists (
            select 1
            from public.local_spots s
            where s.id = o.shop_id
              and s.owner_profile_id = auth.uid()
          )
        )
    )
  )
  with check (
    exists (
      select 1
      from public.orders o
      where o.id = order_id
        and (
          o.customer_id = auth.uid()
          or exists (
            select 1
            from public.local_spots s
            where s.id = o.shop_id
              and s.owner_profile_id = auth.uid()
          )
        )
    )
  );
