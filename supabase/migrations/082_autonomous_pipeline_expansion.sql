-- =============================================================================
-- 082_autonomous_pipeline_expansion.sql
-- - Quest reward -> wallet ledger/account atomic sync
-- - Minihome rental expiry + minihome rollback
-- - Autonomous ops alert generator (ux_metrics_5m -> bot_actions alert)
-- =============================================================================

create or replace function public.ensure_wallet_account(p_profile_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
begin
  if p_profile_id is null then
    raise exception 'PROFILE_REQUIRED';
  end if;

  insert into public.wallet_accounts (profile_id, currency, balance_minor)
  values (p_profile_id, 'DOTORI', 0)
  on conflict (profile_id) do nothing;

  select id
    into v_wallet_id
  from public.wallet_accounts
  where profile_id = p_profile_id
  limit 1;

  if v_wallet_id is null then
    raise exception 'WALLET_ACCOUNT_NOT_FOUND';
  end if;

  return v_wallet_id;
end;
$$;

create or replace function public.sync_quest_reward_to_wallet()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_wallet_id uuid;
  v_reference text;
  v_inserted int := 0;
begin
  if new.status <> 'granted' then
    return new;
  end if;

  v_wallet_id := public.ensure_wallet_account(new.profile_id);
  v_reference := 'quest_reward:' || new.quest_instance_id::text;

  insert into public.wallet_ledger_entries (
    wallet_account_id,
    direction,
    amount_minor,
    reason,
    reference_key,
    metadata
  )
  values (
    v_wallet_id,
    'credit',
    new.reward_corn,
    'quest_reward',
    v_reference,
    jsonb_build_object(
      'quest_instance_id', new.quest_instance_id,
      'quest_code', new.quest_code,
      'period_key', new.period_key
    )
  )
  on conflict (reference_key) do nothing;

  get diagnostics v_inserted = row_count;
  if v_inserted > 0 then
    update public.wallet_accounts
      set balance_minor = balance_minor + new.reward_corn,
          updated_at = now()
    where id = v_wallet_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_quest_reward_wallet_sync on public.quest_reward_ledger;
create trigger trg_quest_reward_wallet_sync
after insert on public.quest_reward_ledger
for each row execute function public.sync_quest_reward_to_wallet();

create or replace function public.minihome_expire_rentals_and_reset()
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int := 0;
  v_row record;
begin
  for v_row in
    update public.minihome_rentals mr
       set status = 'expired',
           updated_at = now()
     where mr.status in ('active', 'renewed', 'rented')
       and mr.ends_at <= now()
     returning mr.profile_id, mr.item_key, mr.applied_payload
  loop
    v_count := v_count + 1;

    -- Remove cosmetic keys from theme; bgm is managed in dedicated columns.
    update public.user_minihomes um
       set theme = coalesce(um.theme, '{}'::jsonb)
                   - array['accent', 'wallpaper', 'minimi', 'profile_frame'],
           bgm_url = case
             when coalesce(v_row.applied_payload->>'bgm_url', '') <> ''
                  and um.bgm_url = v_row.applied_payload->>'bgm_url'
             then null
             else um.bgm_url
           end,
           bgm_title = case
             when coalesce(v_row.applied_payload->>'bgm_url', '') <> ''
                  and um.bgm_url = v_row.applied_payload->>'bgm_url'
             then null
             else um.bgm_title
           end
     where um.owner_id = v_row.profile_id;
  end loop;

  return v_count;
end;
$$;

create or replace function public.ops_generate_autonomous_alerts()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_since timestamptz := now() - interval '10 minutes';
  v_page_view int := 0;
  v_api_error int := 0;
  v_dead_click int := 0;
  v_dead_click_rate numeric := 0;
  v_alerts jsonb := '[]'::jsonb;
  v_msg text;
begin
  select
    coalesce(sum(coalesce((totals->>'page_view')::int, 0)), 0),
    coalesce(sum(coalesce((totals->>'api_error')::int, 0)), 0),
    coalesce(sum(coalesce((totals->>'dead_click')::int, 0)), 0)
  into v_page_view, v_api_error, v_dead_click
  from public.ux_metrics_5m
  where window_start >= v_since;

  if v_page_view > 0 then
    v_dead_click_rate := v_dead_click::numeric / v_page_view::numeric;
  end if;

  if v_page_view >= 800 then
    v_msg := format('TRAFFIC_SURGE page_view_10m=%s', v_page_view);
    insert into public.bot_actions (
      run_id, bot_name, action_type, objective, target_entity, status, priority, error_code, error_message, started_at, finished_at
    ) values (
      gen_random_uuid(), 'ops_autopilot_monitor', 'alert', 'Autonomous ops alert', 'ux_metrics_5m', 'failed', 1,
      'TRAFFIC_SURGE', v_msg, now(), now()
    );
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('code', 'TRAFFIC_SURGE', 'message', v_msg));
  end if;

  if v_api_error >= 30 then
    v_msg := format('API_500_SPIKE api_error_10m=%s', v_api_error);
    insert into public.bot_actions (
      run_id, bot_name, action_type, objective, target_entity, status, priority, error_code, error_message, started_at, finished_at
    ) values (
      gen_random_uuid(), 'ops_autopilot_monitor', 'alert', 'Autonomous ops alert', 'ux_metrics_5m', 'failed', 1,
      'API_500_SPIKE', v_msg, now(), now()
    );
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('code', 'API_500_SPIKE', 'message', v_msg));
  end if;

  if v_dead_click_rate >= 0.10 and v_page_view >= 200 then
    v_msg := format('UX_DEGRADATION dead_click_rate=%.4s page_view_10m=%s', v_dead_click_rate, v_page_view);
    insert into public.bot_actions (
      run_id, bot_name, action_type, objective, target_entity, status, priority, error_code, error_message, started_at, finished_at
    ) values (
      gen_random_uuid(), 'ops_autopilot_monitor', 'alert', 'Autonomous ops alert', 'ux_metrics_5m', 'failed', 2,
      'UX_DEGRADATION', v_msg, now(), now()
    );
    v_alerts := v_alerts || jsonb_build_array(jsonb_build_object('code', 'UX_DEGRADATION', 'message', v_msg));
  end if;

  return v_alerts;
end;
$$;

alter function public.ensure_wallet_account(uuid) owner to postgres;
alter function public.sync_quest_reward_to_wallet() owner to postgres;
alter function public.minihome_expire_rentals_and_reset() owner to postgres;
alter function public.ops_generate_autonomous_alerts() owner to postgres;

grant execute on function public.ensure_wallet_account(uuid) to postgres;
grant execute on function public.sync_quest_reward_to_wallet() to postgres;
grant execute on function public.minihome_expire_rentals_and_reset() to postgres;
grant execute on function public.ops_generate_autonomous_alerts() to postgres;
