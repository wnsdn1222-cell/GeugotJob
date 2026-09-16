-- User-approved case-scoped distance sharing, precise coordinates private, 90-day retention.
-- No introduction registration, electronic-contract provider or payment is enabled here.
create policy "no client configuration access" on private.workflow_configuration for all to authenticated using(false) with check(false);
create policy "no client provider evidence access" on private.contract_provider_evidence for all to authenticated using(false) with check(false);
create policy "no client coordinate access" on private.commute_locations for all to authenticated using(false) with check(false);
create index commute_locations_worker_idx on private.commute_locations(worker_id);
create index commute_locations_expiry_idx on private.commute_locations(expires_at);
create index contract_evidence_employer_idx on private.contract_provider_evidence(employer_profile_id);
create index contract_evidence_intro_idx on private.contract_provider_evidence(introduction_id);
create index contract_evidence_verifier_idx on private.contract_provider_evidence(verified_by);
create index contract_evidence_worker_idx on private.contract_provider_evidence(worker_profile_id);

create function private.guard_workflow_subject() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  if (select auth.uid()) is not null and not private.is_admin() and
    ((tg_op='INSERT' and new.is_test_data) or (tg_op='UPDATE' and new.is_test_data is distinct from old.is_test_data)) then
    raise exception '운영자만 시연 데이터 여부를 지정할 수 있습니다.';
  end if;
  if new.latitude is not null or new.longitude is not null then
    raise exception '정확한 위치는 동의와 접근 권한이 적용되는 전용 위치 저장 기능을 사용하세요.';
  end if;
  return new;
end; $$;
revoke all on function private.guard_workflow_subject() from public,anon,authenticated;
create trigger guard_workflow_worker before insert or update on public.workers for each row execute function private.guard_workflow_subject();
create trigger guard_workflow_job before insert or update on public.job_postings for each row execute function private.guard_workflow_subject();

create function private.initialize_contract_status() returns trigger language plpgsql security invoker set search_path='' as $$
begin
  insert into public.contract_confirmations(introduction_id,status) values(new.id,'pending') on conflict(introduction_id) do nothing;
  return new;
end; $$;
revoke all on function private.initialize_contract_status() from public,anon,authenticated;
create trigger initialize_contract_status after insert on public.manual_introductions for each row execute function private.initialize_contract_status();

update private.workflow_configuration set location_consent_version='case-distance-2026-09-16-v1',location_retention_days=90,
 location_consent_text='선택한 채용 건의 직선거리 계산을 위해 사업장 또는 통근 출발 위치의 위도·경도를 그곳잡 서버에 저장합니다. 정확한 좌표는 다른 회원에게 공개하지 않으며, 해당 채용 건의 고용주·근로자와 그곳잡 운영자에게 직선거리와 기준 거리 이내·밖 결과만 제공합니다. 마지막 저장·동의 후 90일이 지나면 조회·공유를 차단하고 1분 주기의 정리 작업으로 운영 DB에서 삭제합니다. 동의를 철회하면 좌표를 즉시 삭제하고 거리 공유를 해제합니다. 위치 제공은 선택사항이며 거부해도 회원가입·로그인은 이용할 수 있습니다. 동의하지 않으면 해당 위치를 사용하는 거리 확인만 제공되지 않습니다.'
 where singleton;
alter table private.commute_locations add column consent_text text;

create or replace function private.save_commute_location(p_job_id uuid,p_worker_id uuid,p_lat numeric,p_lon numeric,p_consent_version text,p_withdraw boolean default false)
returns jsonb language plpgsql security definer set search_path='' as $$
declare cfg private.workflow_configuration; location_id uuid;
begin
  if (select auth.uid()) is null then raise exception '로그인이 필요합니다.'; end if;
  if (p_worker_id is null and not exists(select 1 from public.job_postings j join public.employers e on e.id=j.employer_id where j.id=p_job_id and e.profile_id=(select auth.uid())))
    or (p_worker_id is not null and not exists(select 1 from public.workers w where w.id=p_worker_id and w.profile_id=(select auth.uid()))) then raise exception '본인 위치만 등록할 수 있습니다.'; end if;
  select id into location_id from private.commute_locations where job_posting_id=p_job_id and worker_id is not distinct from p_worker_id and owner_profile_id=(select auth.uid());
  if p_withdraw then
    delete from private.commute_locations where id=location_id;
    return jsonb_build_object('withdrawn',true,'deleted',true);
  end if;
  if p_worker_id is not null and not exists(select 1 from public.manual_introductions where job_posting_id=p_job_id and worker_id=p_worker_id) then raise exception '본인에게 연결된 채용 건에만 위치를 제공할 수 있습니다.'; end if;
  select * into cfg from private.workflow_configuration where singleton;
  if nullif(trim(cfg.location_consent_version),'') is null or nullif(trim(cfg.location_consent_text),'') is null or cfg.location_retention_days is null or p_consent_version is distinct from cfg.location_consent_version then raise exception '화면의 현재 위치 제공 동의 내용을 확인하세요.'; end if;
  if p_lat is null or p_lon is null or p_lat not between -90 and 90 or p_lon not between -180 and 180 then raise exception '올바른 위치 좌표가 필요합니다.'; end if;
  if location_id is null then
    insert into private.commute_locations(job_posting_id,worker_id,owner_profile_id,latitude,longitude,consent_version,consent_text,expires_at)
    values(p_job_id,p_worker_id,(select auth.uid()),p_lat,p_lon,p_consent_version,cfg.location_consent_text,now()+make_interval(days=>cfg.location_retention_days)) returning id into location_id;
  else
    update private.commute_locations set latitude=p_lat,longitude=p_lon,consent_version=p_consent_version,consent_text=cfg.location_consent_text,consented_at=now(),expires_at=now()+make_interval(days=>cfg.location_retention_days),withdrawn_at=null where id=location_id;
  end if;
  update public.commute_assessments a set status='coordinates_required',distance_km=null,is_nearby=null,evidence_note='위치 갱신됨: 운영자 기준으로 다시 판별하세요.',updated_at=now()
    from public.manual_introductions i where a.introduction_id=i.id and i.job_posting_id=p_job_id and (p_worker_id is null or i.worker_id=p_worker_id);
  return jsonb_build_object('saved',true,'consented_at',now(),'expires_at',now()+make_interval(days=>cfg.location_retention_days));
end; $$;

create function private.invalidate_deleted_location() returns trigger language plpgsql security definer set search_path='' as $$
begin
  update public.commute_assessments a set status='coordinates_required',distance_km=null,is_nearby=null,evidence_note='위치 삭제·동의 철회 또는 보유기간 만료: 거리 확인 불가',updated_at=now()
    from public.manual_introductions i where a.introduction_id=i.id and i.job_posting_id=old.job_posting_id and (old.worker_id is null or i.worker_id=old.worker_id);
  return old;
end; $$;
revoke all on function private.invalidate_deleted_location() from public,anon,authenticated;
create trigger invalidate_deleted_location before delete on private.commute_locations for each row execute function private.invalidate_deleted_location();

create function private.purge_expired_commute_locations() returns bigint language plpgsql security definer set search_path='' as $$
declare count_deleted bigint;
begin
  delete from private.commute_locations where expires_at<=now() or withdrawn_at is not null;
  get diagnostics count_deleted=row_count;
  return count_deleted;
end; $$;
revoke all on function private.purge_expired_commute_locations() from public,anon,authenticated;
create extension if not exists pg_cron with schema pg_catalog;
select cron.schedule('geugot-purge-expired-commute-locations','* * * * *','select private.purge_expired_commute_locations();');
create function private.current_case_commute(p_id uuid) returns jsonb language plpgsql security definer stable set search_path='' as $$
declare i public.manual_introductions; a private.commute_locations; b private.commute_locations; result public.commute_assessments; version text;
begin
  if not private.can_access_introduction(p_id) then raise exception '접근 권한이 없습니다.'; end if;
  select * into i from public.manual_introductions where id=p_id;
  select location_consent_version into version from private.workflow_configuration where singleton;
  select * into a from private.commute_locations where job_posting_id=i.job_posting_id and worker_id is null and withdrawn_at is null and expires_at>now() and consent_version=version;
  select * into b from private.commute_locations where job_posting_id=i.job_posting_id and worker_id=i.worker_id and withdrawn_at is null and expires_at>now() and consent_version=version;
  if a.id is null or b.id is null then return jsonb_build_object('status','coordinates_required','distance_km',null,'is_nearby',null); end if;
  select * into result from public.commute_assessments where introduction_id=p_id;
  if result.id is null then return jsonb_build_object('status','configuration_required','distance_km',null,'is_nearby',null); end if;
  return to_jsonb(result);
end; $$;
revoke all on function private.current_case_commute(uuid) from public,anon;
grant execute on function private.current_case_commute(uuid) to authenticated;
drop policy "parties read commute assessments" on public.commute_assessments;
create policy "parties read current commute assessments" on public.commute_assessments for select to authenticated
  using ((select private.can_access_introduction(introduction_id)) and ((select private.current_case_commute(introduction_id))->>'distance_km') is not null);

create or replace function private.employment_cases() returns jsonb language plpgsql security definer stable set search_path='' as $$
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
    'commute',private.current_case_commute(i.id),
    'own_location',(select jsonb_build_object('latitude',l.latitude,'longitude',l.longitude,'consented_at',l.consented_at,'expires_at',l.expires_at,'consent_version',l.consent_version) from private.commute_locations l where l.job_posting_id=i.job_posting_id and l.owner_profile_id=(select auth.uid()) and (l.worker_id is null or l.worker_id=i.worker_id) and l.withdrawn_at is null and l.expires_at>now()),
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
