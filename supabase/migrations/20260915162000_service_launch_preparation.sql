-- Service launch preparation. This connects existing manual introductions,
-- contracts, payment gates, and work outcomes without enabling production.

alter table private.platform_settings
  add column confirmed_fee_amount_krw integer check (confirmed_fee_amount_krw is null or confirmed_fee_amount_krw > 0),
  add column confirmed_fee_policy_version text,
  add column confirmed_fee_verified_at timestamptz,
  add constraint confirmed_fee_configuration_is_complete check (
    (confirmed_fee_amount_krw is null and confirmed_fee_policy_version is null and confirmed_fee_verified_at is null)
    or (confirmed_fee_amount_krw is not null and nullif(trim(confirmed_fee_policy_version), '') is not null and confirmed_fee_verified_at is not null)
  );

create table public.service_cases (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null unique references public.manual_introductions(id) on delete restrict,
  stage text not null default 'manual_review' check (stage in (
    'manual_review', 'introduced', 'contract_pending', 'contract_confirmed',
    'work_in_progress', 'work_completed', 'closed'
  )),
  operating_mode text not null default 'development' check (operating_mode in ('development', 'production')),
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_cases_stage_updated_idx on public.service_cases(stage, updated_at desc);
create index service_cases_created_by_idx on public.service_cases(created_by);
create index service_cases_updated_by_idx on public.service_cases(updated_by);

create table public.service_case_events (
  id bigint generated always as identity primary key,
  service_case_id uuid not null references public.service_cases(id) on delete cascade,
  from_stage text,
  to_stage text not null,
  source text not null default 'operator_sync' check (source in ('operator_sync', 'system_gate')),
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index service_case_events_case_created_idx on public.service_case_events(service_case_id, created_at desc);
create index service_case_events_recorded_by_idx on public.service_case_events(recorded_by);

create table public.employer_feedback_records (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null references public.manual_introductions(id) on delete restrict,
  work_outcome_id uuid references public.work_outcomes(id) on delete restrict,
  feedback_type text not null check (feedback_type in (
    'introduction', 'contract', 'work_progress', 'contract_completion', 'reuse'
  )),
  feedback_text text not null check (length(trim(feedback_text)) between 1 and 2000),
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create index employer_feedback_intro_created_idx on public.employer_feedback_records(introduction_id, created_at desc);
create index employer_feedback_outcome_idx on public.employer_feedback_records(work_outcome_id) where work_outcome_id is not null;
create index employer_feedback_recorded_by_idx on public.employer_feedback_records(recorded_by);

create function private.launch_service_stage_for(p_introduction_id uuid)
returns text
language sql
security invoker
stable
set search_path = ''
as $$
  select case
    when o.contract_outcome in ('completed', 'ended_early') then 'work_completed'
    when o.contract_outcome = 'in_progress' or o.attendance_status = 'attended' then 'work_in_progress'
    when c.status = 'confirmed' then 'contract_confirmed'
    when c.status in ('pending', 'submitted') then 'contract_pending'
    when i.status = 'introduced' then 'introduced'
    else 'manual_review'
  end
  from public.manual_introductions i
  left join public.contract_confirmations c on c.introduction_id = i.id
  left join public.work_outcomes o on o.introduction_id = i.id
  where i.id = p_introduction_id;
$$;

revoke all on function private.launch_service_stage_for(uuid) from public, anon;
grant execute on function private.launch_service_stage_for(uuid) to authenticated;

create function private.enforce_service_case_mode()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.operating_mode = 'production' and not (select private.paid_introduction_operations_enabled()) then
    raise exception '유료직업소개사업 등록 확인 전에는 정식 서비스 건을 생성할 수 없습니다.';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_service_case_mode() from public, anon, authenticated;
create trigger enforce_service_case_mode before insert or update on public.service_cases
  for each row execute function private.enforce_service_case_mode();

create function private.record_service_case_event()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or old.stage is distinct from new.stage then
    insert into public.service_case_events(service_case_id, from_stage, to_stage, source, recorded_by)
    values(new.id, case when tg_op = 'UPDATE' then old.stage else null end, new.stage, 'operator_sync', new.updated_by);
  end if;
  return new;
end;
$$;

revoke all on function private.record_service_case_event() from public, anon, authenticated;
create trigger record_service_case_event after insert or update on public.service_cases
  for each row execute function private.record_service_case_event();

create function public.sync_service_case(p_introduction_id uuid, p_operating_mode text default 'development')
returns public.service_cases
language plpgsql
security invoker
set search_path = ''
as $$
declare derived_stage text;
declare result public.service_cases;
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then
    raise exception '운영자만 정식 서비스 흐름을 동기화할 수 있습니다.';
  end if;
  if p_operating_mode not in ('development', 'production') then
    raise exception '허용되지 않은 운영 모드입니다.';
  end if;
  derived_stage := private.launch_service_stage_for(p_introduction_id);
  if derived_stage is null then raise exception '소개 기록을 찾을 수 없습니다.'; end if;

  insert into public.service_cases(introduction_id, stage, operating_mode, created_by, updated_by)
  values(p_introduction_id, derived_stage, p_operating_mode, (select auth.uid()), (select auth.uid()))
  on conflict (introduction_id) do update set
    stage = excluded.stage,
    operating_mode = excluded.operating_mode,
    updated_by = excluded.updated_by,
    updated_at = now()
  returning * into result;
  return result;
end;
$$;

revoke all on function public.sync_service_case(uuid, text) from public, anon;
grant execute on function public.sync_service_case(uuid, text) to authenticated;

create function private.live_fee_payment_transition_allowed(
  desired_status text,
  contract_confirmed boolean,
  paid_operations_enabled boolean,
  payment_integration_verified boolean,
  provider_matches boolean,
  confirmed_fee_amount integer,
  recorded_amount integer
)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select case
    when desired_status <> 'paid' then true
    else contract_confirmed
      and paid_operations_enabled
      and payment_integration_verified
      and provider_matches
      and confirmed_fee_amount is not null
      and recorded_amount = confirmed_fee_amount
  end;
$$;

revoke all on function private.live_fee_payment_transition_allowed(text, boolean, boolean, boolean, boolean, integer, integer)
from public, anon, authenticated;

create or replace function private.enforce_live_fee_payment_gate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare settings private.platform_settings;
declare contract_confirmed boolean;
begin
  select * into settings from private.platform_settings where singleton = true;
  select exists (
    select 1 from public.contract_confirmations c
    where c.introduction_id = new.introduction_id and c.status = 'confirmed'
  ) into contract_confirmed;

  if not private.live_fee_payment_transition_allowed(
    new.status,
    contract_confirmed,
    settings.paid_introduction_operations_enabled and settings.paid_introduction_registration_verified_at is not null,
    settings.payment_integration_verified_at is not null,
    new.provider_name is not distinct from settings.payment_provider_name,
    settings.confirmed_fee_amount_krw,
    new.amount_krw
  ) then
    raise exception '계약·사업 등록·결제 연동·확정 수수료 확인 전에는 결제 완료를 기록할 수 없습니다.';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_live_fee_payment_gate() from public, anon, authenticated;

alter table public.service_cases enable row level security;
alter table public.service_case_events enable row level security;
alter table public.employer_feedback_records enable row level security;

revoke all on table public.service_cases, public.service_case_events, public.employer_feedback_records from anon, authenticated;
grant select, insert, update on public.service_cases to authenticated;
grant select, insert on public.service_case_events, public.employer_feedback_records to authenticated;

create policy "authorized users read service cases" on public.service_cases for select to authenticated
  using (
    (select private.is_admin()) or exists (
      select 1 from public.manual_introductions i
      left join public.workers w on w.id = i.worker_id
      left join public.job_postings j on j.id = i.job_posting_id
      left join public.employers e on e.id = j.employer_id
      where i.id = introduction_id and (w.profile_id = (select auth.uid()) or e.profile_id = (select auth.uid()))
    )
  );
create policy "admins create service cases" on public.service_cases for insert to authenticated
  with check ((select private.is_admin()) and created_by = (select auth.uid()) and updated_by = (select auth.uid()));
create policy "admins update service cases" on public.service_cases for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()) and updated_by = (select auth.uid()));

create policy "authorized users read service events" on public.service_case_events for select to authenticated
  using (
    (select private.is_admin()) or exists (
      select 1 from public.service_cases sc
      join public.manual_introductions i on i.id = sc.introduction_id
      left join public.workers w on w.id = i.worker_id
      left join public.job_postings j on j.id = i.job_posting_id
      left join public.employers e on e.id = j.employer_id
      where sc.id = service_case_id and (w.profile_id = (select auth.uid()) or e.profile_id = (select auth.uid()))
    )
  );
create policy "admins create service events" on public.service_case_events for insert to authenticated
  with check ((select private.is_admin()) and recorded_by = (select auth.uid()));

create policy "authorized users read employer feedback" on public.employer_feedback_records for select to authenticated
  using (
    (select private.is_admin()) or exists (
      select 1 from public.manual_introductions i
      join public.job_postings j on j.id = i.job_posting_id
      join public.employers e on e.id = j.employer_id
      where i.id = introduction_id and e.profile_id = (select auth.uid())
    )
  );
create policy "employers create own feedback" on public.employer_feedback_records for insert to authenticated
  with check (
    recorded_by = (select auth.uid()) and exists (
      select 1 from public.manual_introductions i
      join public.job_postings j on j.id = i.job_posting_id
      join public.employers e on e.id = j.employer_id
      where i.id = introduction_id and e.profile_id = (select auth.uid())
    )
    and (work_outcome_id is null or exists (
      select 1 from public.work_outcomes o where o.id = work_outcome_id and o.introduction_id = introduction_id
    ))
  );

-- Demo records are deliberately isolated from auth users and real service data.
create table public.demo_employers (
  id bigint generated always as identity primary key,
  demo_code text not null unique,
  display_name text not null,
  city text not null,
  industry text not null,
  data_label text not null default '시연용 가상 데이터' check (data_label = '시연용 가상 데이터'),
  created_at timestamptz not null default now()
);

create table public.demo_workers (
  id bigint generated always as identity primary key,
  demo_code text not null unique,
  display_name text not null,
  city text not null,
  job_category text not null,
  experience_months integer not null check (experience_months >= 0),
  data_label text not null default '시연용 가상 데이터' check (data_label = '시연용 가상 데이터'),
  created_at timestamptz not null default now()
);

insert into public.demo_employers(demo_code, display_name, city, industry)
select
  'DEMO-E-' || lpad(n::text, 3, '0'),
  '가상 사업장 ' || lpad(n::text, 3, '0'),
  '시연 지역 ' || (((n - 1) % 10) + 1)::text,
  (array['물류', '생산', '포장', '식품', '서비스'])[((n - 1) % 5) + 1]
from generate_series(1, 200) as n;

insert into public.demo_workers(demo_code, display_name, city, job_category, experience_months)
select
  'DEMO-W-' || lpad(n::text, 3, '0'),
  '가상 근로자 ' || lpad(n::text, 3, '0'),
  '시연 지역 ' || (((n - 1) % 10) + 1)::text,
  (array['물류', '생산', '포장', '식품', '서비스'])[((n - 1) % 5) + 1],
  ((n - 1) % 61)
from generate_series(1, 30) as n;

alter table public.demo_employers enable row level security;
alter table public.demo_workers enable row level security;
revoke all on table public.demo_employers, public.demo_workers from anon, authenticated;
grant select on table public.demo_employers, public.demo_workers to anon, authenticated;
create policy "demo employers are publicly readable" on public.demo_employers for select to anon, authenticated using (true);
create policy "demo workers are publicly readable" on public.demo_workers for select to anon, authenticated using (true);

create or replace function private.get_open_beta_readiness()
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare settings private.platform_settings;
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then
    raise exception '운영자만 오픈 베타 설정 상태를 확인할 수 있습니다.';
  end if;
  select * into settings from private.platform_settings where singleton = true;
  return jsonb_build_object(
    'commute_method', settings.commute_distance_method,
    'nearby_threshold_km', settings.nearby_threshold_km,
    'distance_provider_configured', nullif(trim(settings.distance_provider_name), '') is not null,
    'wage_confirmation_policy_configured', nullif(trim(settings.wage_incident_confirmation_policy_version), '') is not null,
    'employer_restriction_policy_configured', nullif(trim(settings.employer_restriction_policy_version), '') is not null,
    'paid_operations_enabled', settings.paid_introduction_operations_enabled and settings.paid_introduction_registration_verified_at is not null,
    'payment_integration_verified', settings.payment_integration_verified_at is not null and nullif(trim(settings.payment_provider_name), '') is not null,
    'confirmed_fee_amount_krw', settings.confirmed_fee_amount_krw,
    'confirmed_fee_policy_version', settings.confirmed_fee_policy_version,
    'confirmed_fee_verified_at', settings.confirmed_fee_verified_at
  );
end;
$$;

revoke all on function private.get_open_beta_readiness() from public, anon;
grant execute on function private.get_open_beta_readiness() to authenticated;

