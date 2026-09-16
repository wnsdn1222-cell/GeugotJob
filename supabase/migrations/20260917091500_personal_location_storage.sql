-- A personal location is stored only for its owner. It is deliberately separate
-- from a job-specific location, which has its own sharing consent.
alter table private.workflow_configuration
  add column if not exists personal_location_consent_version text,
  add column if not exists personal_location_consent_text text;

update private.workflow_configuration
set personal_location_consent_version='personal-location-2026-09-17-v1',
    personal_location_consent_text='로그인한 회원은 본인 기기의 현재 위치를 그곳잡 서버에 90일간 저장할 수 있습니다. 이 기본 위치의 정확한 좌표는 다른 회원이나 고용주에게 공개하지 않으며, 특정 채용 건의 거리 계산·공유에도 자동으로 사용하지 않습니다. 채용 건별 거리 확인은 해당 화면에서 별도 동의 후에만 이루어집니다. 동의 철회 시 기본 위치를 즉시 삭제하며, 위치 제공을 거부해도 회원가입·로그인은 이용할 수 있습니다.'
where singleton;

create table private.personal_location_preferences (
  owner_profile_id uuid primary key references public.profiles(id) on delete cascade,
  latitude numeric not null check(latitude between -90 and 90),
  longitude numeric not null check(longitude between -180 and 180),
  consent_version text not null,
  consent_text text not null,
  consented_at timestamptz not null default now(),
  expires_at timestamptz not null,
  check(expires_at>consented_at)
);
alter table private.personal_location_preferences enable row level security;
revoke all on private.personal_location_preferences from public,anon,authenticated;

create or replace function private.workflow_readiness()
returns jsonb language plpgsql security definer stable set search_path='' as $$
declare cfg private.workflow_configuration; settings private.platform_settings;
begin
  if (select auth.uid()) is null then raise exception '로그인이 필요합니다.'; end if;
  select * into cfg from private.workflow_configuration where singleton;
  select * into settings from private.platform_settings where singleton;
  return jsonb_build_object('contract_connected',cfg.contract_integration_verified_at is not null and cfg.contract_provider is not null,
    'introduction_enabled',private.paid_introduction_operations_enabled(),'nearby_threshold_km',settings.nearby_threshold_km,
    'location_ready',nullif(trim(cfg.location_consent_version),'') is not null and nullif(trim(cfg.location_consent_text),'') is not null and cfg.location_retention_days is not null,
    'location_consent_version',cfg.location_consent_version,'location_consent_text',cfg.location_consent_text,'location_retention_days',cfg.location_retention_days,
    'personal_location_ready',nullif(trim(cfg.personal_location_consent_version),'') is not null and nullif(trim(cfg.personal_location_consent_text),'') is not null and cfg.location_retention_days is not null,
    'personal_location_consent_version',cfg.personal_location_consent_version,'personal_location_consent_text',cfg.personal_location_consent_text);
end; $$;

create function private.personal_location_status()
returns jsonb language plpgsql security definer stable set search_path='' as $$
declare actor uuid; item private.personal_location_preferences;
begin
  actor:=(select auth.uid());
  if actor is null then raise exception '로그인이 필요합니다.'; end if;
  select * into item from private.personal_location_preferences where owner_profile_id=actor and expires_at>now();
  if item.owner_profile_id is null then return jsonb_build_object('saved',false); end if;
  return jsonb_build_object('saved',true,'consented_at',item.consented_at,'expires_at',item.expires_at,'consent_version',item.consent_version);
end; $$;
create function public.personal_location_status()
returns jsonb language sql security invoker set search_path='' as $$ select private.personal_location_status(); $$;
revoke all on function private.personal_location_status(),public.personal_location_status() from public,anon;
grant execute on function private.personal_location_status(),public.personal_location_status() to authenticated;

create function private.save_personal_location(p_lat numeric,p_lon numeric,p_withdraw boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare actor uuid; cfg private.workflow_configuration;
begin
  actor:=(select auth.uid());
  if actor is null then raise exception '로그인이 필요합니다.'; end if;
  if p_withdraw then
    delete from private.personal_location_preferences where owner_profile_id=actor;
    return jsonb_build_object('withdrawn',true,'deleted',true);
  end if;
  select * into cfg from private.workflow_configuration where singleton;
  if nullif(trim(cfg.personal_location_consent_version),'') is null or nullif(trim(cfg.personal_location_consent_text),'') is null or cfg.location_retention_days is null then raise exception '기본 위치정보 동의 설정을 확인하세요.'; end if;
  if p_lat is null or p_lon is null or p_lat not between -90 and 90 or p_lon not between -180 and 180 then raise exception '현재 기기 위치를 확인할 수 없습니다.'; end if;
  insert into private.personal_location_preferences(owner_profile_id,latitude,longitude,consent_version,consent_text,expires_at)
  values(actor,p_lat,p_lon,cfg.personal_location_consent_version,cfg.personal_location_consent_text,now()+make_interval(days=>cfg.location_retention_days))
  on conflict(owner_profile_id) do update set latitude=excluded.latitude,longitude=excluded.longitude,consent_version=excluded.consent_version,consent_text=excluded.consent_text,consented_at=now(),expires_at=excluded.expires_at;
  return jsonb_build_object('saved',true,'consented_at',now(),'expires_at',now()+make_interval(days=>cfg.location_retention_days));
end; $$;
create function public.save_personal_location(p_lat numeric,p_lon numeric,p_withdraw boolean default false)
returns jsonb language sql security invoker set search_path='' as $$ select private.save_personal_location(p_lat,p_lon,p_withdraw); $$;
revoke all on function private.save_personal_location(numeric,numeric,boolean),public.save_personal_location(numeric,numeric,boolean) from public,anon;
grant execute on function private.save_personal_location(numeric,numeric,boolean),public.save_personal_location(numeric,numeric,boolean) to authenticated;

create or replace function private.purge_expired_commute_locations() returns bigint language plpgsql security definer set search_path='' as $$
declare removed_cases bigint; removed_personal bigint;
begin
  delete from private.commute_locations where expires_at<=now() or withdrawn_at is not null;
  get diagnostics removed_cases=row_count;
  delete from private.personal_location_preferences where expires_at<=now();
  get diagnostics removed_personal=row_count;
  return removed_cases+removed_personal;
end; $$;
