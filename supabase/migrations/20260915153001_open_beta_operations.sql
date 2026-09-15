-- Open-beta operational records. Undefined operational policies remain locked
-- until an administrator records the reviewed configuration explicitly.

alter table private.platform_settings
  add column commute_distance_method text
    check (commute_distance_method is null or commute_distance_method in ('straight_line_haversine', 'route_provider', 'manual_verified')),
  add column nearby_threshold_km numeric(7, 2)
    check (nearby_threshold_km is null or nearby_threshold_km > 0),
  add column distance_provider_name text,
  add column wage_incident_confirmation_policy_version text,
  add column employer_restriction_policy_version text,
  add column payment_integration_verified_at timestamptz,
  add column payment_provider_name text,
  add constraint route_distance_requires_provider
    check (commute_distance_method <> 'route_provider' or nullif(trim(distance_provider_name), '') is not null),
  add constraint verified_payment_requires_provider
    check (payment_integration_verified_at is null or nullif(trim(payment_provider_name), '') is not null);

create function private.haversine_km(lat1 numeric, lon1 numeric, lat2 numeric, lon2 numeric)
returns numeric
language sql
immutable
strict
set search_path = ''
as $$
  select round((6371 * 2 * asin(sqrt(
    power(sin(radians((lat2 - lat1)::double precision) / 2), 2)
    + cos(radians(lat1::double precision)) * cos(radians(lat2::double precision))
    * power(sin(radians((lon2 - lon1)::double precision) / 2), 2)
  )))::numeric, 2);
$$;

revoke all on function private.haversine_km(numeric, numeric, numeric, numeric) from public, anon, authenticated;

create table public.commute_assessments (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null unique references public.manual_introductions(id) on delete cascade,
  distance_method text check (distance_method is null or distance_method in ('straight_line_haversine', 'route_provider', 'manual_verified')),
  distance_km numeric(7, 2) check (distance_km is null or distance_km >= 0),
  nearby_threshold_km numeric(7, 2) check (nearby_threshold_km is null or nearby_threshold_km > 0),
  is_nearby boolean,
  status text not null default 'configuration_required'
    check (status in ('configuration_required', 'coordinates_required', 'provider_required', 'calculated', 'manual_verified')),
  evidence_note text check (evidence_note is null or length(evidence_note) <= 1000),
  assessed_by uuid not null references public.profiles(id),
  assessed_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status not in ('calculated', 'manual_verified')
    or (distance_method is not null and distance_km is not null and nearby_threshold_km is not null and is_nearby is not null)
  )
);

create index commute_assessments_assessed_by_idx on public.commute_assessments(assessed_by);

create function public.calculate_commute_assessment(p_introduction_id uuid)
returns public.commute_assessments
language plpgsql
security definer
set search_path = ''
as $$
declare
  settings private.platform_settings;
  job_lat numeric;
  job_lon numeric;
  worker_lat numeric;
  worker_lon numeric;
  calculated_distance numeric;
  result public.commute_assessments;
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then
    raise exception '운영자만 출퇴근 거리를 판별할 수 있습니다.';
  end if;

  select * into settings from private.platform_settings where singleton = true;
  if settings.commute_distance_method is null or settings.nearby_threshold_km is null then
    raise exception '근거리 기준과 거리 계산 방식을 먼저 확정해야 합니다.';
  end if;
  if settings.commute_distance_method <> 'straight_line_haversine' then
    raise exception '선택한 거리 계산 방식에는 외부 제공자 또는 수동 검증 연동이 필요합니다.';
  end if;

  select j.latitude, j.longitude, w.latitude, w.longitude
    into job_lat, job_lon, worker_lat, worker_lon
  from public.manual_introductions i
  join public.job_postings j on j.id = i.job_posting_id
  join public.workers w on w.id = i.worker_id
  where i.id = p_introduction_id;

  if not found then raise exception '소개 기록을 찾을 수 없습니다.'; end if;
  if job_lat is null or job_lon is null or worker_lat is null or worker_lon is null then
    raise exception '사업장과 근로자 위치 좌표가 모두 필요합니다.';
  end if;

  calculated_distance := private.haversine_km(job_lat, job_lon, worker_lat, worker_lon);
  insert into public.commute_assessments (
    introduction_id, distance_method, distance_km, nearby_threshold_km,
    is_nearby, status, assessed_by, assessed_at, updated_at
  ) values (
    p_introduction_id, settings.commute_distance_method, calculated_distance,
    settings.nearby_threshold_km, calculated_distance <= settings.nearby_threshold_km,
    'calculated', (select auth.uid()), now(), now()
  )
  on conflict (introduction_id) do update set
    distance_method = excluded.distance_method,
    distance_km = excluded.distance_km,
    nearby_threshold_km = excluded.nearby_threshold_km,
    is_nearby = excluded.is_nearby,
    status = excluded.status,
    assessed_by = excluded.assessed_by,
    assessed_at = excluded.assessed_at,
    updated_at = excluded.updated_at
  returning * into result;
  return result;
end;
$$;

revoke all on function public.calculate_commute_assessment(uuid) from public, anon;
grant execute on function public.calculate_commute_assessment(uuid) to authenticated;

create table public.wage_payment_responses (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null unique references public.manual_introductions(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete restrict,
  response text not null check (response in ('paid', 'not_paid', 'partially_paid', 'unknown')),
  response_note text check (response_note is null or length(response_note) <= 2000),
  responded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index wage_payment_responses_worker_idx on public.wage_payment_responses(worker_id, responded_at desc);

create function private.enforce_wage_response_after_work()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if not exists (
    select 1 from public.manual_introductions i
    join public.workers w on w.id = i.worker_id
    join public.work_outcomes o on o.introduction_id = i.id
    where i.id = new.introduction_id
      and w.id = new.worker_id
      and o.contract_outcome in ('completed', 'ended_early')
  ) then
    raise exception '근무 종료 결과가 기록된 소개에 대해서만 급여 지급 여부를 응답할 수 있습니다.';
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_wage_response_after_work() from public, anon, authenticated;
create trigger enforce_wage_response_after_work
  before insert or update on public.wage_payment_responses
  for each row execute function private.enforce_wage_response_after_work();

create table public.wage_incident_reviews (
  id uuid primary key default gen_random_uuid(),
  response_id uuid not null unique references public.wage_payment_responses(id) on delete restrict,
  status text not null default 'pending'
    check (status in ('pending', 'needs_information', 'confirmed', 'dismissed')),
  review_basis text check (review_basis is null or length(trim(review_basis)) between 1 and 2000),
  policy_version text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (status <> 'confirmed' or (review_basis is not null and policy_version is not null and reviewed_by is not null and reviewed_at is not null))
);

create index wage_incident_reviews_reviewer_idx on public.wage_incident_reviews(reviewed_by) where reviewed_by is not null;

create function private.enforce_wage_incident_review_policy()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare configured_version text;
begin
  if new.status = 'confirmed' then
    select wage_incident_confirmation_policy_version into configured_version
    from private.platform_settings where singleton = true;
    if configured_version is null or new.policy_version is distinct from configured_version then
      raise exception '미지급 확정 기준이 설정되고 동일한 정책 버전이 기록되어야 합니다.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_wage_incident_review_policy() from public, anon, authenticated;
create trigger enforce_wage_incident_review_policy
  before insert or update on public.wage_incident_reviews
  for each row execute function private.enforce_wage_incident_review_policy();

create table public.employer_access_controls (
  employer_id uuid primary key references public.employers(id) on delete cascade,
  status text not null default 'active' check (status in ('active', 'review_required', 'restricted', 'cleared')),
  related_review_id uuid references public.wage_incident_reviews(id) on delete restrict,
  policy_version text,
  decision_basis text check (decision_basis is null or length(trim(decision_basis)) between 1 and 2000),
  decided_by uuid references public.profiles(id),
  decided_at timestamptz,
  updated_at timestamptz not null default now(),
  check (status <> 'restricted' or (related_review_id is not null and policy_version is not null and decision_basis is not null and decided_by is not null and decided_at is not null))
);

create index employer_access_controls_review_idx on public.employer_access_controls(related_review_id) where related_review_id is not null;

create function private.enforce_employer_restriction_policy()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare configured_version text;
begin
  if new.status = 'restricted' then
    select employer_restriction_policy_version into configured_version
    from private.platform_settings where singleton = true;
    if configured_version is null or new.policy_version is distinct from configured_version then
      raise exception '고용주 이용 제한 기준이 설정되고 동일한 정책 버전이 기록되어야 합니다.';
    end if;
    if not exists (select 1 from public.wage_incident_reviews r where r.id = new.related_review_id and r.status = 'confirmed') then
      raise exception '확정된 미지급 검토 기록 없이는 이용을 제한할 수 없습니다.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_employer_restriction_policy() from public, anon, authenticated;
create trigger enforce_employer_restriction_policy
  before insert or update on public.employer_access_controls
  for each row execute function private.enforce_employer_restriction_policy();

create function private.employer_service_allowed(target_employer_id uuid)
returns boolean
language sql
security definer
stable
set search_path = ''
as $$
  select not exists (
    select 1 from public.employer_access_controls c
    where c.employer_id = target_employer_id and c.status = 'restricted'
  );
$$;

revoke all on function private.employer_service_allowed(uuid) from public, anon;
grant execute on function private.employer_service_allowed(uuid) to authenticated;

create table public.matching_criterion_records (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null references public.manual_introductions(id) on delete cascade,
  criterion_name text not null check (length(trim(criterion_name)) between 1 and 120),
  observation text not null check (length(trim(observation)) between 1 and 2000),
  status text not null default 'observed' check (status in ('observed', 'candidate', 'approved')),
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index matching_criterion_records_intro_created_idx on public.matching_criterion_records(introduction_id, created_at desc);
create index matching_criterion_records_recorded_by_idx on public.matching_criterion_records(recorded_by);

create table public.fee_payment_records (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null references public.manual_introductions(id) on delete restrict,
  payer_profile_id uuid not null references public.profiles(id) on delete restrict,
  amount_krw integer not null check (amount_krw > 0),
  status text not null default 'pending_verification'
    check (status in ('pending_verification', 'paid', 'failed', 'refunded')),
  provider_name text,
  external_payment_id text,
  paid_at timestamptz,
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (provider_name, external_payment_id),
  check (status <> 'paid' or (provider_name is not null and external_payment_id is not null and paid_at is not null))
);

create index fee_payment_records_intro_created_idx on public.fee_payment_records(introduction_id, created_at desc);
create index fee_payment_records_payer_created_idx on public.fee_payment_records(payer_profile_id, created_at desc);
create index fee_payment_records_recorded_by_idx on public.fee_payment_records(recorded_by);

create function private.enforce_live_fee_payment_gate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare settings private.platform_settings;
begin
  if new.status = 'paid' then
    select * into settings from private.platform_settings where singleton = true;
    if not settings.paid_introduction_operations_enabled
       or settings.paid_introduction_registration_verified_at is null
       or settings.payment_integration_verified_at is null
       or new.provider_name is distinct from settings.payment_provider_name then
      raise exception '사업 등록과 실결제 제공자 연동 확인 전에는 결제 완료를 기록할 수 없습니다.';
    end if;
    if not exists (select 1 from public.contract_confirmations c where c.introduction_id = new.introduction_id and c.status = 'confirmed') then
      raise exception '계약 체결 확인 전에는 수수료 결제를 완료 처리할 수 없습니다.';
    end if;
  end if;
  return new;
end;
$$;

revoke all on function private.enforce_live_fee_payment_gate() from public, anon, authenticated;
create trigger enforce_live_fee_payment_gate
  before insert or update on public.fee_payment_records
  for each row execute function private.enforce_live_fee_payment_gate();

create table public.reuse_intentions (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles(id) on delete cascade,
  introduction_id uuid references public.manual_introductions(id) on delete set null,
  response text not null check (response in ('yes', 'no', 'undecided')),
  response_note text check (response_note is null or length(response_note) <= 1000),
  responded_at timestamptz not null default now()
);

create index reuse_intentions_profile_responded_idx on public.reuse_intentions(profile_id, responded_at desc);
create index reuse_intentions_intro_idx on public.reuse_intentions(introduction_id) where introduction_id is not null;

create table public.operating_costs (
  id uuid primary key default gen_random_uuid(),
  cost_date date not null,
  category text not null check (length(trim(category)) between 1 and 100),
  amount_krw integer not null check (amount_krw > 0),
  description text check (description is null or length(description) <= 1000),
  evidence_reference text check (evidence_reference is null or length(evidence_reference) <= 1000),
  recorded_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index operating_costs_date_idx on public.operating_costs(cost_date desc);
create index operating_costs_recorded_by_idx on public.operating_costs(recorded_by);

alter table public.commute_assessments enable row level security;
alter table public.wage_payment_responses enable row level security;
alter table public.wage_incident_reviews enable row level security;
alter table public.employer_access_controls enable row level security;
alter table public.matching_criterion_records enable row level security;
alter table public.fee_payment_records enable row level security;
alter table public.reuse_intentions enable row level security;
alter table public.operating_costs enable row level security;

revoke all on table public.commute_assessments, public.wage_payment_responses,
  public.wage_incident_reviews, public.employer_access_controls,
  public.matching_criterion_records, public.fee_payment_records,
  public.reuse_intentions, public.operating_costs from anon, authenticated;

grant select, insert, update on table public.commute_assessments, public.wage_payment_responses,
  public.wage_incident_reviews, public.employer_access_controls,
  public.matching_criterion_records, public.fee_payment_records to authenticated;
grant select, insert on table public.reuse_intentions, public.operating_costs to authenticated;

create policy "admins manage commute assessments" on public.commute_assessments for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()) and assessed_by = (select auth.uid()));
create policy "participants read own commute assessments" on public.commute_assessments for select to authenticated
  using (exists (
    select 1 from public.manual_introductions i
    left join public.workers w on w.id = i.worker_id
    left join public.job_postings j on j.id = i.job_posting_id
    left join public.employers e on e.id = j.employer_id
    where i.id = introduction_id and (w.profile_id = (select auth.uid()) or e.profile_id = (select auth.uid()))
  ));

create policy "workers read own wage responses" on public.wage_payment_responses for select to authenticated
  using (exists (select 1 from public.workers w where w.id = worker_id and w.profile_id = (select auth.uid())));
create policy "workers create own wage responses" on public.wage_payment_responses for insert to authenticated
  with check (exists (select 1 from public.workers w where w.id = worker_id and w.profile_id = (select auth.uid())));
create policy "workers update own wage responses" on public.wage_payment_responses for update to authenticated
  using (exists (select 1 from public.workers w where w.id = worker_id and w.profile_id = (select auth.uid())))
  with check (exists (select 1 from public.workers w where w.id = worker_id and w.profile_id = (select auth.uid())));
create policy "admins read wage responses" on public.wage_payment_responses for select to authenticated using ((select private.is_admin()));

create policy "admins manage wage incident reviews" on public.wage_incident_reviews for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "workers read reviews of own responses" on public.wage_incident_reviews for select to authenticated
  using (exists (
    select 1 from public.wage_payment_responses r
    join public.workers w on w.id = r.worker_id
    where r.id = response_id and w.profile_id = (select auth.uid())
  ));

create policy "admins manage employer access" on public.employer_access_controls for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));
create policy "employers read own access" on public.employer_access_controls for select to authenticated
  using (exists (select 1 from public.employers e where e.id = employer_id and e.profile_id = (select auth.uid())));

create policy "admins manage matching criteria" on public.matching_criterion_records for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()) and recorded_by = (select auth.uid()));

create policy "admins manage fee payment records" on public.fee_payment_records for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()) and recorded_by = (select auth.uid()));
create policy "payers read own fee payment records" on public.fee_payment_records for select to authenticated
  using (payer_profile_id = (select auth.uid()));

create policy "users read own reuse intentions" on public.reuse_intentions for select to authenticated
  using (profile_id = (select auth.uid()));
create policy "users create own reuse intentions" on public.reuse_intentions for insert to authenticated
  with check (profile_id = (select auth.uid()));
create policy "admins read reuse intentions" on public.reuse_intentions for select to authenticated using ((select private.is_admin()));

create policy "admins manage operating costs" on public.operating_costs for all to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()) and recorded_by = (select auth.uid()));

create policy "restricted employers cannot create jobs" on public.job_postings as restrictive for insert to authenticated
  with check ((select private.employer_service_allowed(employer_id)));
create policy "restricted employers cannot update jobs" on public.job_postings as restrictive for update to authenticated
  using ((select private.employer_service_allowed(employer_id)))
  with check ((select private.employer_service_allowed(employer_id)));
create policy "restricted employers cannot receive introductions" on public.manual_introductions as restrictive for insert to authenticated
  with check (exists (
    select 1 from public.job_postings j
    where j.id = job_posting_id and (select private.employer_service_allowed(j.employer_id))
  ));

