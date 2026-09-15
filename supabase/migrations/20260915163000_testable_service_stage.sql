create function private.launch_service_stage_from_inputs(
  introduction_status text,
  contract_status text,
  attendance_status text,
  contract_outcome text
)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when contract_outcome in ('completed', 'ended_early') then 'work_completed'
    when contract_outcome = 'in_progress' or attendance_status = 'attended' then 'work_in_progress'
    when contract_status = 'confirmed' then 'contract_confirmed'
    when contract_status in ('pending', 'submitted') then 'contract_pending'
    when introduction_status = 'introduced' then 'introduced'
    else 'manual_review'
  end;
$$;

revoke all on function private.launch_service_stage_from_inputs(text, text, text, text)
from public, anon, authenticated;

create or replace function private.launch_service_stage_for(p_introduction_id uuid)
returns text
language sql
security invoker
stable
set search_path = ''
as $$
  select private.launch_service_stage_from_inputs(i.status, c.status, o.attendance_status, o.contract_outcome)
  from public.manual_introductions i
  left join public.contract_confirmations c on c.introduction_id = i.id
  left join public.work_outcomes o on o.introduction_id = i.id
  where i.id = p_introduction_id;
$$;

revoke all on function private.launch_service_stage_for(uuid) from public, anon;
grant execute on function private.launch_service_stage_for(uuid) to authenticated;

