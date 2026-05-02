-- Run manually against the linked project when stale ui_incident rows keep the radar red
-- after the app is already healthy (live tier). Example:
--   npx supabase db execute --file supabase/maintenance/omni_clear_ui_incidents.sql --linked
--
-- Safer: stamp a fresh motherbrain heal ack (matches checkUiIncidentRadar + motherbrain-heal inserts).
insert into public.publish_logs (target_type, target_id, channel, meta)
values (
  'motherbrain_heal',
  gen_random_uuid(),
  'system_health',
  jsonb_build_object(
    'event', 'motherbrain_heal_ok',
    'source', 'maintenance_omni_clear_ui_incidents',
    'at', now()::text
  )
);

-- Optional hard reset (audit trail loss): uncomment to delete client UI incident logs.
-- delete from public.publish_logs where channel = 'ui_incident';
