-- Consent is obtained in the UI before the browser location request. This only
-- calculates from already-authorized, private coordinates; it never exposes them.
create function private.refresh_automatic_commute(p_job_id uuid,p_worker_id uuid,p_assessed_by uuid)
returns void language plpgsql security definer set search_path='' as $$
declare cfg private.workflow_configuration; settings private.platform_settings; item public.manual_introductions; workplace private.commute_locations; departure private.commute_locations; calculated numeric;
begin
  select * into cfg from private.workflow_configuration where singleton;
  select * into settings from private.platform_settings where singleton;
  for item in select * from public.manual_introductions where job_posting_id=p_job_id and (p_worker_id is null or worker_id=p_worker_id) loop
    select * into workplace from private.commute_locations where job_posting_id=item.job_posting_id and worker_id is null and withdrawn_at is null and expires_at>now() and consent_version=cfg.location_consent_version;
    select * into departure from private.commute_locations where job_posting_id=item.job_posting_id and worker_id=item.worker_id and withdrawn_at is null and expires_at>now() and consent_version=cfg.location_consent_version;
    if workplace.id is null or departure.id is null then
      insert into public.commute_assessments(introduction_id,status,evidence_note,assessed_by)
      values(item.id,'coordinates_required','동의된 사업장 또는 출발 위치가 없어 자동 거리 확인 불가',p_assessed_by)
      on conflict(introduction_id) do update set distance_method=null,distance_km=null,nearby_threshold_km=null,is_nearby=null,status='coordinates_required',evidence_note=excluded.evidence_note,assessed_by=excluded.assessed_by,assessed_at=now(),updated_at=now();
    else
      calculated:=private.haversine_km(workplace.latitude,workplace.longitude,departure.latitude,departure.longitude);
      insert into public.commute_assessments(introduction_id,distance_method,distance_km,nearby_threshold_km,is_nearby,status,evidence_note,assessed_by)
      values(item.id,'straight_line_haversine',calculated,settings.nearby_threshold_km,case when settings.nearby_threshold_km is null then null else calculated<=settings.nearby_threshold_km end,case when settings.nearby_threshold_km is null then 'configuration_required' else 'calculated' end,'동의된 현재 위치 자동 저장 후 직선거리 자동 계산 · 이동거리·통근시간 아님',p_assessed_by)
      on conflict(introduction_id) do update set distance_method=excluded.distance_method,distance_km=excluded.distance_km,nearby_threshold_km=excluded.nearby_threshold_km,is_nearby=excluded.is_nearby,status=excluded.status,evidence_note=excluded.evidence_note,assessed_by=excluded.assessed_by,assessed_at=now(),updated_at=now();
    end if;
  end loop;
end; $$;
revoke all on function private.refresh_automatic_commute(uuid,uuid,uuid) from public,anon,authenticated;

create or replace function private.save_commute_location(p_job_id uuid,p_worker_id uuid,p_lat numeric,p_lon numeric,p_consent_version text,p_withdraw boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.workflow_configuration; location_id uuid; actor uuid;
begin
  actor:=(select auth.uid());
  if actor is null then raise exception '로그인이 필요합니다.'; end if;
  if (p_worker_id is null and not exists(select 1 from public.job_postings j join public.employers e on e.id=j.employer_id where j.id=p_job_id and e.profile_id=actor))
    or (p_worker_id is not null and not exists(select 1 from public.workers w where w.id=p_worker_id and w.profile_id=actor)) then raise exception '본인 위치만 등록할 수 있습니다.'; end if;
  select id into location_id from private.commute_locations where job_posting_id=p_job_id and worker_id is not distinct from p_worker_id and owner_profile_id=actor;
  if p_withdraw then
    delete from private.commute_locations where id=location_id;
    return jsonb_build_object('withdrawn',true,'deleted',true);
  end if;
  if p_worker_id is not null and not exists(select 1 from public.manual_introductions where job_posting_id=p_job_id and worker_id=p_worker_id) then raise exception '본인에게 연결된 채용 건에만 위치를 제공할 수 있습니다.'; end if;
  select * into cfg from private.workflow_configuration where singleton;
  if nullif(trim(cfg.location_consent_version),'') is null or nullif(trim(cfg.location_consent_text),'') is null or cfg.location_retention_days is null or p_consent_version is distinct from cfg.location_consent_version then raise exception '화면의 현재 위치 제공 동의 내용을 확인하세요.'; end if;
  if p_lat is null or p_lon is null or p_lat not between -90 and 90 or p_lon not between -180 and 180 then raise exception '현재 기기 위치를 확인할 수 없습니다.'; end if;
  if location_id is null then
    insert into private.commute_locations(job_posting_id,worker_id,owner_profile_id,latitude,longitude,consent_version,consent_text,expires_at)
    values(p_job_id,p_worker_id,actor,p_lat,p_lon,p_consent_version,cfg.location_consent_text,now()+make_interval(days=>cfg.location_retention_days));
  else
    update private.commute_locations set latitude=p_lat,longitude=p_lon,consent_version=p_consent_version,consent_text=cfg.location_consent_text,consented_at=now(),expires_at=now()+make_interval(days=>cfg.location_retention_days),withdrawn_at=null where id=location_id;
  end if;
  perform private.refresh_automatic_commute(p_job_id,p_worker_id,actor);
  return jsonb_build_object('saved',true,'consented_at',now(),'expires_at',now()+make_interval(days=>cfg.location_retention_days));
end; $$;
