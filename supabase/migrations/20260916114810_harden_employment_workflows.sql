-- No registration, provider, consent policy or fee is enabled by this migration.
-- Filename aligned with the applied Supabase migration history version.
create table private.workflow_configuration (
  singleton boolean primary key default true check(singleton),
  contract_provider text,
  contract_integration_verified_at timestamptz,
  location_consent_version text,
  location_consent_text text,
  location_retention_days integer check(location_retention_days > 0)
);
insert into private.workflow_configuration(singleton) values(true);
alter table private.workflow_configuration enable row level security;
revoke all on private.workflow_configuration from public, anon, authenticated;

-- Only a future trusted provider adapter can write verified evidence. Never a browser.
create table private.contract_provider_evidence (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null references public.manual_introductions(id),
  employer_profile_id uuid not null references public.profiles(id),
  worker_profile_id uuid not null references public.profiles(id),
  provider text not null,
  external_contract_id text not null,
  provider_event_id text not null,
  evidence_reference text not null check(length(trim(evidence_reference)) > 0),
  executed_at timestamptz not null,
  checked_at timestamptz not null default now(),
  verified_by uuid not null references public.profiles(id),
  unique(provider,provider_event_id)
);
alter table private.contract_provider_evidence enable row level security;
revoke all on private.contract_provider_evidence from public, anon, authenticated;

alter table public.contract_confirmations
  add column verification_source text not null default 'unconnected' check(verification_source in ('unconnected','provider_verified')),
  add column provider_evidence_id uuid references private.contract_provider_evidence(id),
  add column checked_at timestamptz;
create index contract_confirmations_evidence_idx on public.contract_confirmations(provider_evidence_id) where provider_evidence_id is not null;

create function private.can_access_introduction(p_id uuid)
returns boolean language sql security definer stable set search_path='' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from public.manual_introductions i
    join public.job_postings j on j.id=i.job_posting_id
    join public.employers e on e.id=j.employer_id
    join public.workers w on w.id=i.worker_id
    where i.id=p_id and ((select private.is_admin()) or e.profile_id=(select auth.uid()) or w.profile_id=(select auth.uid()))
  );
$$;
revoke all on function private.can_access_introduction(uuid) from public,anon;
grant execute on function private.can_access_introduction(uuid) to authenticated;

create function private.enforce_verified_contract()
returns trigger language plpgsql security definer set search_path='' as $$
declare proof private.contract_provider_evidence; cfg private.workflow_configuration;
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then raise exception '운영자 권한이 필요합니다.'; end if;
  if tg_op='UPDATE' and new.introduction_id is distinct from old.introduction_id then raise exception '계약 대상은 변경할 수 없습니다.'; end if;
  new.updated_at := now();
  if new.status='confirmed' then
    select * into cfg from private.workflow_configuration where singleton;
    select p.* into proof from private.contract_provider_evidence p
      join public.manual_introductions i on i.id=p.introduction_id
      join public.workers w on w.id=i.worker_id
      join public.job_postings j on j.id=i.job_posting_id
      join public.employers e on e.id=j.employer_id
      where p.id=new.provider_evidence_id and p.introduction_id=new.introduction_id
        and p.worker_profile_id=w.profile_id and p.employer_profile_id=e.profile_id;
    if proof.id is null or cfg.contract_integration_verified_at is null
      or proof.provider is distinct from cfg.contract_provider
      or proof.executed_at > now() or proof.checked_at > now() then
      raise exception '전자계약 연동 준비 중: 검증된 체결 근거 없이는 완료 처리할 수 없습니다.';
    end if;
    new.verification_source := 'provider_verified';
    new.confirmation_method := proof.provider || ' 검증된 계약 상태';
    new.evidence_reference := proof.evidence_reference;
    new.confirmed_by := proof.verified_by;
    new.confirmed_at := proof.executed_at;
    new.checked_at := proof.checked_at;
  else
    new.verification_source := 'unconnected'; new.provider_evidence_id := null;
    new.confirmed_at := null; new.confirmed_by := null; new.checked_at := null;
    if new.status='submitted' and nullif(trim(new.evidence_reference),'') is null then
      raise exception '확인자료 접수에는 증빙 참조가 필요합니다. 체결 확인은 아닙니다.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_verified_contract() from public,anon,authenticated;
create trigger enforce_verified_contract before insert or update on public.contract_confirmations
  for each row execute function private.enforce_verified_contract();

create table public.contract_status_events (
  id bigint generated always as identity primary key,
  introduction_id uuid not null references public.manual_introductions(id),
  status text not null, verification_source text not null,
  evidence_reference text, checked_at timestamptz,
  recorded_by uuid not null references public.profiles(id), recorded_at timestamptz not null default now()
);
create index contract_status_events_intro_idx on public.contract_status_events(introduction_id,recorded_at desc);
create index contract_status_events_actor_idx on public.contract_status_events(recorded_by);
alter table public.contract_status_events enable row level security;
revoke all on public.contract_status_events from public,anon,authenticated;
grant select on public.contract_status_events to authenticated;
create policy "parties read contract history" on public.contract_status_events for select to authenticated
  using ((select private.can_access_introduction(introduction_id)));
create function private.audit_contract_status()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then raise exception '운영자 권한이 필요합니다.'; end if;
  insert into public.contract_status_events(introduction_id,status,verification_source,evidence_reference,checked_at,recorded_by)
    values(new.introduction_id,new.status,new.verification_source,new.evidence_reference,new.checked_at,(select auth.uid()));
  return new;
end;
$$;
revoke all on function private.audit_contract_status() from public,anon,authenticated;
create trigger audit_contract_status after insert or update on public.contract_confirmations for each row execute function private.audit_contract_status();

drop policy "participants or admins read contract status" on public.contract_confirmations;
create policy "parties read contract status" on public.contract_confirmations for select to authenticated using ((select private.can_access_introduction(introduction_id)));
drop policy "participants or admins read introductions" on public.manual_introductions;
create policy "parties read manual introductions" on public.manual_introductions for select to authenticated using ((select private.can_access_introduction(id)));
drop policy "participants or admins read work outcomes" on public.work_outcomes;
create policy "parties read work outcomes" on public.work_outcomes for select to authenticated using ((select private.can_access_introduction(introduction_id)));
drop policy "authorized users read wage responses" on public.wage_payment_responses;
create policy "parties read wage responses" on public.wage_payment_responses for select to authenticated using ((select private.can_access_introduction(introduction_id)));
drop policy "authorized users read commute assessments" on public.commute_assessments;
create policy "parties read commute assessments" on public.commute_assessments for select to authenticated using ((select private.can_access_introduction(introduction_id)));

create table public.wage_response_events (
  id bigint generated always as identity primary key,
  introduction_id uuid not null references public.manual_introductions(id),
  worker_id uuid not null references public.workers(id),
  response text not null, response_note text,
  responded_at timestamptz not null default now()
);
create index wage_response_events_intro_idx on public.wage_response_events(introduction_id,responded_at desc);
create index wage_response_events_worker_idx on public.wage_response_events(worker_id);
alter table public.wage_response_events enable row level security;
revoke all on public.wage_response_events from public,anon,authenticated;
grant select on public.wage_response_events to authenticated;
create policy "parties read wage history" on public.wage_response_events for select to authenticated using ((select private.can_access_introduction(introduction_id)));
create or replace function private.enforce_wage_response_after_work()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if (select auth.uid()) is null or not exists (
    select 1 from public.workers w where w.id=new.worker_id and w.profile_id=(select auth.uid())
  ) then raise exception '근로자 본인만 응답할 수 있습니다.'; end if;
  if tg_op='UPDATE' and (new.worker_id is distinct from old.worker_id or new.introduction_id is distinct from old.introduction_id) then
    raise exception '급여 응답 대상을 변경할 수 없습니다.';
  end if;
  if new.response not in ('paid','not_paid') then raise exception '지급받음 또는 아직 지급받지 못함을 선택하세요.'; end if;
  if not exists (
    select 1 from public.manual_introductions i join public.work_outcomes o on o.introduction_id=i.id
    where i.id=new.introduction_id and i.worker_id=new.worker_id and o.contract_outcome in ('completed','ended_early')
  ) then raise exception '근무 종료가 기록된 건만 응답할 수 있습니다.'; end if;
  new.responded_at:=now(); new.updated_at:=now();
  return new;
end;
$$;
create function private.audit_wage_response()
returns trigger language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid()) is null or not exists(select 1 from public.workers w where w.id=new.worker_id and w.profile_id=(select auth.uid())) then raise exception '본인 응답만 기록합니다.'; end if;
  insert into public.wage_response_events(introduction_id,worker_id,response,response_note,responded_at)
    values(new.introduction_id,new.worker_id,new.response,new.response_note,new.responded_at);
  return new;
end;
$$;
revoke all on function private.audit_wage_response() from public,anon,authenticated;
create trigger audit_wage_response after insert or update on public.wage_payment_responses for each row execute function private.audit_wage_response();

-- Protect the payment gate independently of any browser state or nullable predicate.
create or replace function private.enforce_closed_beta_payment_gate()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.charge_status='blocked' then return new; end if;
  perform 1 from public.contract_confirmations c where c.introduction_id=new.introduction_id
    and c.status='confirmed' and c.verification_source='provider_verified' and c.provider_evidence_id is not null for share;
  if not found then raise exception '검증된 계약 체결 확인 전에는 결제할 수 없습니다.'; end if;
  if new.payment_method_status<>'test_registered' or new.payment_consent_status<>'agreed' then raise exception '테스트 결제수단과 동의가 필요합니다.'; end if;
  if not exists(select 1 from public.manual_introductions i where i.id=new.introduction_id and i.operating_mode='development') then
    raise exception '실결제 미연결: 개발 테스트만 허용됩니다.';
  end if;
  return new;
end;
$$;

-- A development row must explicitly be a test subject, never an actual customer.
alter table public.workers add column is_test_data boolean not null default false;
alter table public.job_postings add column is_test_data boolean not null default false;
create function private.guard_manual_introduction()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if (select auth.uid()) is null or not (select private.is_admin()) then raise exception '운영자만 수동 선택할 수 있습니다.'; end if;
  if tg_op='UPDATE' and (new.job_posting_id is distinct from old.job_posting_id or new.worker_id is distinct from old.worker_id or new.operating_mode is distinct from old.operating_mode) then raise exception '수동 매칭 당사자와 모드는 변경할 수 없습니다.'; end if;
  if new.operating_mode='production' and not (select private.paid_introduction_operations_enabled()) then raise exception '사업 등록 확인 전에는 실제 소개를 운영할 수 없습니다.'; end if;
  if new.operating_mode='development' and not exists (
    select 1 from public.job_postings j,public.workers w where j.id=new.job_posting_id and w.id=new.worker_id and j.is_test_data and w.is_test_data
  ) then raise exception '등록 확인 전에는 시연용 예시 데이터로만 수동 흐름을 검증합니다.'; end if;
  new.conditions_reviewed_at:=now(); new.updated_at:=now();
  return new;
end;
$$;
revoke all on function private.guard_manual_introduction() from public,anon,authenticated;
create trigger guard_manual_introduction before insert or update on public.manual_introductions for each row execute function private.guard_manual_introduction();

-- Precise coordinates are private, consented for one job, expiring and revocable.
create table private.commute_locations (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid not null references public.job_postings(id),
  worker_id uuid references public.workers(id),
  owner_profile_id uuid not null references public.profiles(id),
  latitude numeric not null check(latitude between -90 and 90),
  longitude numeric not null check(longitude between -180 and 180),
  consent_version text not null, consented_at timestamptz not null default now(),
  expires_at timestamptz not null, withdrawn_at timestamptz,
  check(expires_at>consented_at)
);
create unique index commute_locations_job_worker_idx on private.commute_locations(job_posting_id,worker_id) where worker_id is not null;
create unique index commute_locations_workplace_idx on private.commute_locations(job_posting_id) where worker_id is null;
create index commute_locations_owner_idx on private.commute_locations(owner_profile_id);
alter table private.commute_locations enable row level security;
revoke all on private.commute_locations from public,anon,authenticated;

create function private.workflow_readiness()
returns jsonb language plpgsql security definer stable set search_path='' as $$
declare cfg private.workflow_configuration; settings private.platform_settings;
begin
  if (select auth.uid()) is null then raise exception '로그인이 필요합니다.'; end if;
  select * into cfg from private.workflow_configuration where singleton;
  select * into settings from private.platform_settings where singleton;
  return jsonb_build_object('contract_connected',cfg.contract_integration_verified_at is not null and cfg.contract_provider is not null,
    'introduction_enabled',private.paid_introduction_operations_enabled(),
    'nearby_threshold_km',settings.nearby_threshold_km,
    'location_ready',nullif(trim(cfg.location_consent_version),'') is not null and nullif(trim(cfg.location_consent_text),'') is not null and cfg.location_retention_days is not null,
    'location_consent_version',cfg.location_consent_version,'location_consent_text',cfg.location_consent_text,'location_retention_days',cfg.location_retention_days);
end;
$$;
create function public.workflow_readiness() returns jsonb language sql security invoker set search_path='' as $$ select private.workflow_readiness(); $$;
revoke all on function private.workflow_readiness(),public.workflow_readiness() from public,anon;
grant execute on function private.workflow_readiness(),public.workflow_readiness() to authenticated;

create function private.save_commute_location(p_job_id uuid,p_worker_id uuid,p_lat numeric,p_lon numeric,p_consent_version text,p_withdraw boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.workflow_configuration; location_id uuid;
begin
  if (select auth.uid()) is null then raise exception '로그인이 필요합니다.'; end if;
  if (p_worker_id is null and not exists(select 1 from public.job_postings j join public.employers e on e.id=j.employer_id where j.id=p_job_id and e.profile_id=(select auth.uid())))
    or (p_worker_id is not null and not exists(select 1 from public.workers w where w.id=p_worker_id and w.profile_id=(select auth.uid()))) then raise exception '본인 위치만 등록할 수 있습니다.'; end if;
  select id into location_id from private.commute_locations where job_posting_id=p_job_id and worker_id is not distinct from p_worker_id and owner_profile_id=(select auth.uid());
  if p_withdraw then
    update private.commute_locations set withdrawn_at=now() where id=location_id;
    update public.commute_assessments a set status='coordinates_required',distance_km=null,is_nearby=null,evidence_note='위치 제공 동의 철회로 거리 확인 불가',updated_at=now()
      from public.manual_introductions i where a.introduction_id=i.id and i.job_posting_id=p_job_id and (p_worker_id is null or i.worker_id=p_worker_id);
    return jsonb_build_object('withdrawn',true);
  end if;
  select * into cfg from private.workflow_configuration where singleton;
  if cfg.location_consent_version is null or cfg.location_consent_text is null or cfg.location_retention_days is null or p_consent_version is distinct from cfg.location_consent_version then raise exception '위치정보 동의 문안과 보유기간 설정 준비 중입니다.'; end if;
  if not private.paid_introduction_operations_enabled() then raise exception '실제 소개 운영과 위치 제공은 등록 확인 후 연결됩니다.'; end if;
  if p_lat is null or p_lon is null or p_lat not between -90 and 90 or p_lon not between -180 and 180 then raise exception '올바른 위치 좌표가 필요합니다.'; end if;
  if location_id is null then
    insert into private.commute_locations(job_posting_id,worker_id,owner_profile_id,latitude,longitude,consent_version,expires_at)
      values(p_job_id,p_worker_id,(select auth.uid()),p_lat,p_lon,p_consent_version,now()+make_interval(days=>cfg.location_retention_days)) returning id into location_id;
  else
    update private.commute_locations set latitude=p_lat,longitude=p_lon,consent_version=p_consent_version,consented_at=now(),expires_at=now()+make_interval(days=>cfg.location_retention_days),withdrawn_at=null where id=location_id;
  end if;
  return jsonb_build_object('saved',true,'consented_at',now());
end;
$$;
create function public.save_commute_location(p_job_id uuid,p_worker_id uuid,p_lat numeric,p_lon numeric,p_consent_version text,p_withdraw boolean default false)
returns jsonb language sql security invoker set search_path='' as $$ select private.save_commute_location(p_job_id,p_worker_id,p_lat,p_lon,p_consent_version,p_withdraw); $$;
revoke all on function private.save_commute_location(uuid,uuid,numeric,numeric,text,boolean),public.save_commute_location(uuid,uuid,numeric,numeric,text,boolean) from public,anon;
grant execute on function private.save_commute_location(uuid,uuid,numeric,numeric,text,boolean),public.save_commute_location(uuid,uuid,numeric,numeric,text,boolean) to authenticated;

create or replace function private.haversine_km(lat1 numeric,lon1 numeric,lat2 numeric,lon2 numeric)
returns numeric language sql immutable strict set search_path='' as $$
 select (6371 * 2 * asin(sqrt(least(1::float8,greatest(0::float8,
   power(sin(radians((lat2-lat1)::float8)/2),2)+cos(radians(lat1::float8))*cos(radians(lat2::float8))*power(sin(radians((lon2-lon1)::float8)/2),2)
 )))))::numeric;
$$;
create function private.preview_commute(p_job_id uuid,p_worker_id uuid,p_threshold numeric)
returns jsonb language plpgsql security definer stable set search_path='' as $$
declare cfg private.workflow_configuration; a private.commute_locations; b private.commute_locations; threshold numeric; distance numeric;
begin
  if (select auth.uid()) is null or not private.is_admin() then raise exception '운영자만 거리 판별을 요청할 수 있습니다.'; end if;
  if not exists(select 1 from public.job_postings where id=p_job_id) or not exists(select 1 from public.workers where id=p_worker_id) then raise exception '비교 대상을 찾을 수 없습니다.'; end if;
  select coalesce(p_threshold,nearby_threshold_km) into threshold from private.platform_settings where singleton;
  if threshold is null then return jsonb_build_object('status','configuration_required','message','기준 거리 설정 필요','distance_km',null,'is_nearby',null); end if;
  if threshold<=0 or threshold>99999.99 then raise exception '유효한 양수 기준 거리(km)를 입력하세요.'; end if;
  select * into cfg from private.workflow_configuration where singleton;
  select * into a from private.commute_locations where job_posting_id=p_job_id and worker_id is null and withdrawn_at is null and expires_at>now() and consent_version=cfg.location_consent_version;
  select * into b from private.commute_locations where job_posting_id=p_job_id and worker_id=p_worker_id and withdrawn_at is null and expires_at>now() and consent_version=cfg.location_consent_version;
  if a.id is null or b.id is null or cfg.location_consent_text is null then return jsonb_build_object('status','coordinates_required','message','거리 확인 불가: 유효한 위치 제공 동의·좌표 없음','distance_km',null,'is_nearby',null,'nearby_threshold_km',threshold); end if;
  distance:=private.haversine_km(a.latitude,a.longitude,b.latitude,b.longitude);
  return jsonb_build_object('status','calculated','distance_method','straight_line_haversine','distance_km',distance,'nearby_threshold_km',threshold,'is_nearby',distance<=threshold,'message','동의된 출발 위치와 사업장의 직선거리 · 실제 이동거리·시간 아님');
end;
$$;
create function public.preview_commute(p_job_id uuid,p_worker_id uuid,p_threshold numeric default null)
returns jsonb language sql security invoker set search_path='' as $$ select private.preview_commute(p_job_id,p_worker_id,p_threshold); $$;
revoke all on function private.preview_commute(uuid,uuid,numeric),public.preview_commute(uuid,uuid,numeric) from public,anon;
grant execute on function private.preview_commute(uuid,uuid,numeric),public.preview_commute(uuid,uuid,numeric) to authenticated;

revoke insert,update on public.commute_assessments from authenticated;
create function private.assess_introduction_commute(p_id uuid,p_threshold numeric)
returns public.commute_assessments language plpgsql security definer set search_path='' as $$
declare i public.manual_introductions; preview jsonb; result public.commute_assessments;
begin
  if (select auth.uid()) is null or not private.is_admin() then raise exception '운영자 권한이 필요합니다.'; end if;
  select * into i from public.manual_introductions where id=p_id;
  if i.id is null then raise exception '소개 기록을 찾을 수 없습니다.'; end if;
  preview:=private.preview_commute(i.job_posting_id,i.worker_id,p_threshold);
  insert into public.commute_assessments(introduction_id,distance_method,distance_km,nearby_threshold_km,is_nearby,status,evidence_note,assessed_by)
  values(p_id,preview->>'distance_method',(preview->>'distance_km')::numeric,(preview->>'nearby_threshold_km')::numeric,(preview->>'is_nearby')::boolean,preview->>'status',preview->>'message',(select auth.uid()))
  on conflict(introduction_id) do update set distance_method=excluded.distance_method,distance_km=excluded.distance_km,nearby_threshold_km=excluded.nearby_threshold_km,is_nearby=excluded.is_nearby,status=excluded.status,evidence_note=excluded.evidence_note,assessed_by=excluded.assessed_by,assessed_at=now(),updated_at=now()
  returning * into result;
  return result;
end;
$$;
create function public.assess_introduction_commute(p_id uuid,p_threshold numeric default null) returns public.commute_assessments language sql security invoker set search_path='' as $$ select * from private.assess_introduction_commute(p_id,p_threshold); $$;
revoke all on function private.assess_introduction_commute(uuid,numeric),public.assess_introduction_commute(uuid,numeric) from public,anon;
grant execute on function private.assess_introduction_commute(uuid,numeric),public.assess_introduction_commute(uuid,numeric) to authenticated;
create or replace function private.calculate_commute_assessment(p_introduction_id uuid) returns public.commute_assessments language sql security invoker set search_path='' as $$ select * from private.assess_introduction_commute(p_introduction_id,null); $$;

-- Saved demo workflow is owner-only and has no references to real employment cases.
create table public.workflow_demo_runs (
  owner_profile_id uuid primary key references public.profiles(id) on delete cascade,
  demo_employer_id bigint references public.demo_employers(id),
  demo_worker_id bigint references public.demo_workers(id),
  matching_reason text check(length(matching_reason)<=2000),
  employer_feedback text check(length(employer_feedback)<=2000),
  contract_status text not null default 'pending' check(contract_status in ('pending','submitted')),
  contract_evidence text check(length(contract_evidence)<=1000),
  work_ended boolean not null default false,
  wage_response text check(wage_response in ('paid','not_paid')),
  wage_responded_at timestamptz,
  nearby_threshold_km numeric check(nearby_threshold_km>0 and nearby_threshold_km<=99999.99),
  data_label text not null default '시연용 예시' check(data_label='시연용 예시'),
  updated_at timestamptz not null default now(),
  check(wage_response is null or (work_ended and wage_responded_at is not null)),
  check(contract_status<>'submitted' or nullif(trim(contract_evidence),'') is not null)
);
create index workflow_demo_employer_idx on public.workflow_demo_runs(demo_employer_id);
create index workflow_demo_worker_idx on public.workflow_demo_runs(demo_worker_id);
alter table public.workflow_demo_runs enable row level security;
revoke all on public.workflow_demo_runs from public,anon,authenticated;
grant select,insert,update on public.workflow_demo_runs to authenticated;
create policy "owners read demo workflows" on public.workflow_demo_runs for select to authenticated using(owner_profile_id=(select auth.uid()));
create policy "owners create demo workflows" on public.workflow_demo_runs for insert to authenticated with check(owner_profile_id=(select auth.uid()));
create policy "owners update demo workflows" on public.workflow_demo_runs for update to authenticated using(owner_profile_id=(select auth.uid())) with check(owner_profile_id=(select auth.uid()));
create function private.guard_demo_workflow() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if (select auth.uid()) is null or new.owner_profile_id is distinct from (select auth.uid()) then raise exception '본인 시연 기록만 저장합니다.'; end if;
  new.updated_at:=now();
  if new.wage_response is null then new.wage_responded_at:=null;
  elsif tg_op='INSERT' or new.wage_response is distinct from old.wage_response then new.wage_responded_at:=now();
  else new.wage_responded_at:=old.wage_responded_at; end if;
  return new;
end;
$$;
revoke all on function private.guard_demo_workflow() from public,anon,authenticated;
create trigger guard_demo_workflow before insert or update on public.workflow_demo_runs for each row execute function private.guard_demo_workflow();

create function private.enforce_verified_fee() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if new.status='paid' then
    perform 1 from public.contract_confirmations c where c.introduction_id=new.introduction_id and c.status='confirmed' and c.verification_source='provider_verified' and c.provider_evidence_id is not null for share;
    if not found then raise exception '검증된 계약 체결 확인 전에는 수수료 결제를 완료할 수 없습니다.'; end if;
  end if;
  return new;
end;
$$;
revoke all on function private.enforce_verified_fee() from public,anon,authenticated;
create trigger enforce_verified_fee before insert or update on public.fee_payment_records for each row execute function private.enforce_verified_fee();

create or replace function private.enforce_contract_confirmation_dependencies() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if old.status='confirmed' and new.status<>'confirmed' and (
    exists(select 1 from public.payment_preparations p where p.introduction_id=new.introduction_id and p.charge_status<>'blocked')
    or exists(select 1 from public.fee_payment_records p where p.introduction_id=new.introduction_id and p.status='paid')
  ) then raise exception '결제 가능 또는 완료 기록의 검토 전에는 계약 확인을 변경할 수 없습니다.'; end if;
  return new;
end;
$$;

-- Minimal participant projection; no precise location, contact details or private documents.
create function private.employment_cases() returns jsonb language plpgsql security definer stable set search_path='' as $$
begin
  if (select auth.uid()) is null then raise exception '로그인이 필요합니다.'; end if;
  return coalesce((select jsonb_agg(jsonb_build_object(
    'id',i.id,'job_posting_id',i.job_posting_id,'worker_id',i.worker_id,
    'employer_profile_id',e.profile_id,'worker_profile_id',w.profile_id,
    'job_title',j.title,'company_name',e.company_name,'worker_name',p.full_name,
    'operating_mode',i.operating_mode,'status',i.status,'comparison_notes',i.comparison_notes,
    'selection_reason',i.selection_reason,'employer_feedback',i.employer_feedback,'created_at',i.created_at,
    'contract',(select to_jsonb(c)-'provider_evidence_id' from public.contract_confirmations c where c.introduction_id=i.id),
    'outcome',(select to_jsonb(o) from public.work_outcomes o where o.introduction_id=i.id),
    'wage',(select to_jsonb(r) from public.wage_payment_responses r where r.introduction_id=i.id),
    'contract_events',coalesce((select jsonb_agg(to_jsonb(h) order by h.recorded_at desc) from public.contract_status_events h where h.introduction_id=i.id),'[]'::jsonb),
    'wage_events',coalesce((select jsonb_agg(to_jsonb(h) order by h.responded_at desc) from public.wage_response_events h where h.introduction_id=i.id),'[]'::jsonb)
  ) order by i.created_at desc)
  from public.manual_introductions i join public.job_postings j on j.id=i.job_posting_id
  join public.employers e on e.id=j.employer_id join public.workers w on w.id=i.worker_id
  join public.profiles p on p.id=w.profile_id
  where private.can_access_introduction(i.id)),'[]'::jsonb);
end;
$$;
create function public.employment_cases() returns jsonb language sql security invoker set search_path='' as $$ select private.employment_cases(); $$;
revoke all on function private.employment_cases(),public.employment_cases() from public,anon;
grant execute on function private.employment_cases(),public.employment_cases() to authenticated;
