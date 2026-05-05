-- Motherbrain / 운영 힐: 오래된 pipeline_error_events 정리를 위해 service_role DELETE 허용
begin;

grant delete on public.pipeline_error_events to service_role;

commit;
