-- Integration test. All identities, records, policy config and evidence are temporary.
-- ROLLBACK is mandatory. No real customer or existing admin account is changed.
begin;
create temporary table test_ids as select gen_random_uuid() admin,gen_random_uuid() worker1,gen_random_uuid() worker2,
  gen_random_uuid() employer1,gen_random_uuid() employer2,gen_random_uuid() w1,gen_random_uuid() w2,
  gen_random_uuid() e1,gen_random_uuid() e2,gen_random_uuid() j1,gen_random_uuid() j2,
  gen_random_uuid() i1,gen_random_uuid() i2,gen_random_uuid() proof;
grant select on test_ids to authenticated;
insert into auth.users(id,email,raw_user_meta_data)
  select v.id,'workflow-test-'||v.id||'@example.invalid',jsonb_build_object('full_name','시연용 예시 테스트','role',v.role)
  from test_ids t cross join lateral(values(t.admin,'worker'),(t.worker1,'worker'),(t.worker2,'worker'),(t.employer1,'employer'),(t.employer2,'employer')) v(id,role);
update public.profiles set role='admin' where id=(select admin from test_ids);
insert into public.employers(id,profile_id,company_name) select e1,employer1,'시연용 예시 사업장 A' from test_ids union all select e2,employer2,'시연용 예시 사업장 B' from test_ids;
insert into public.workers(id,profile_id,job_category,city,is_test_data) select w1,worker1,'시연 직무','시연 지역',true from test_ids union all select w2,worker2,'시연 직무','시연 지역',true from test_ids;
insert into public.job_postings(id,employer_id,title,job_category,city,is_test_data) select j1,e1,'시연용 예시 공고 A','시연 직무','시연 지역',true from test_ids union all select j2,e2,'시연용 예시 공고 B','시연 직무','시연 지역',true from test_ids;
insert into public.closed_beta_participants(profile_id,participant_role,approved_by)
  select v.id,v.role::public.account_role,t.admin from test_ids t cross join lateral(values(t.worker1,'worker'),(t.worker2,'worker'),(t.employer1,'employer'),(t.employer2,'employer'))v(id,role);

select set_config('request.jwt.claims',(select jsonb_build_object('sub',admin,'role','authenticated')::text from test_ids),true);
set local role authenticated;
insert into public.manual_introductions(id,job_posting_id,worker_id,operator_id,comparison_notes,selection_reason,employer_feedback,conditions_reviewed_at,status,operating_mode)
  select i1,j1,w1,admin,'시연용 예시: 조건 직접 비교','시연용 예시: 운영자가 선택한 근거','시연용 예시: 고용주 의견',now(),'selected','development' from test_ids;
insert into public.manual_introductions(id,job_posting_id,worker_id,operator_id,comparison_notes,selection_reason,conditions_reviewed_at,status,operating_mode)
  select i2,j2,w2,admin,'시연용 예시 비교 B','시연용 예시 근거 B',now(),'selected','development' from test_ids;
-- The introduction INSERT itself persists a pending (not confirmed) contract status.
do $$ begin
  if not exists(select 1 from public.manual_introductions where id=(select i1 from test_ids) and status='selected' and selection_reason='시연용 예시: 운영자가 선택한 근거') then raise exception 'FAIL manual selection persistence'; end if;
  if (select status from public.contract_confirmations where introduction_id=(select i1 from test_ids))<>'pending' then raise exception 'FAIL selection changed contract'; end if;
  begin
    update public.contract_confirmations set status='confirmed',confirmation_method='clicked button',confirmed_by=(select admin from test_ids),confirmed_at=now() where introduction_id=(select i1 from test_ids);
    raise sqlstate 'ZX001' using message='FAIL unverified contract accepted';
  exception when sqlstate 'P0001' then null; end;
  begin
    insert into public.payment_preparations(introduction_id,payer_profile_id,payment_method_status,payment_consent_status,consented_at,charge_status)
      select i1,employer1,'test_registered','agreed',now(),'eligible' from test_ids;
    raise sqlstate 'ZX001' using message='FAIL payment before contract accepted';
  exception when sqlstate 'P0001' then null; end;
  if (public.preview_commute((select j1 from test_ids),(select w1 from test_ids),1)->>'is_nearby') is not null then raise exception 'FAIL missing location is nearby'; end if;
end; $$;
reset role;
-- Trusted verification fixture only. Does not represent a real contract or enable production.
update private.workflow_configuration set contract_provider='TEST_FIXTURE',contract_integration_verified_at=now(),location_consent_version='TEST_ONLY',location_consent_text='시연용 예시: 테스트 트랜잭션 전용',location_retention_days=90 where singleton;
insert into private.contract_provider_evidence(id,introduction_id,employer_profile_id,worker_profile_id,provider,external_contract_id,provider_event_id,evidence_reference,executed_at,verified_by)
  select proof,i1,employer1,worker1,'TEST_FIXTURE','TEST_CONTRACT','TEST_'||proof,'시연용 예시 증빙',now(),admin from test_ids;
insert into private.commute_locations(job_posting_id,worker_id,owner_profile_id,latitude,longitude,consent_version,expires_at)
  select j1,null,employer1,0,0,'TEST_ONLY',now()+interval '1 day' from test_ids union all
  select j1,w1,worker1,0.005,0,'TEST_ONLY',now()+interval '1 day' from test_ids union all
  select j1,w2,worker2,0.05,0,'TEST_ONLY',now()+interval '1 day' from test_ids;
set local role authenticated;
update public.contract_confirmations set status='confirmed',provider_evidence_id=(select proof from test_ids) where introduction_id=(select i1 from test_ids);
insert into public.work_outcomes(introduction_id,contract_outcome,recorded_by) select i1,'completed',admin from test_ids;
do $$ declare r jsonb; d numeric; begin
  r:=public.preview_commute((select j1 from test_ids),(select w1 from test_ids),1);
  if (r->>'is_nearby')::boolean is distinct from true then raise exception 'FAIL nearby inside'; end if;
  d:=(r->>'distance_km')::numeric;
  if (public.preview_commute((select j1 from test_ids),(select w1 from test_ids),d)->>'is_nearby')::boolean is distinct from true then raise exception 'FAIL boundary included'; end if;
  if (public.preview_commute((select j1 from test_ids),(select w1 from test_ids),d-0.000001)->>'is_nearby')::boolean is distinct from false then raise exception 'FAIL below boundary'; end if;
  if (public.preview_commute((select j1 from test_ids),(select w2 from test_ids),1)->>'is_nearby')::boolean is distinct from false then raise exception 'FAIL outside'; end if;
  perform public.assess_introduction_commute((select i1 from test_ids),1);
  if not exists(select 1 from public.commute_assessments where introduction_id=(select i1 from test_ids) and distance_method='straight_line_haversine' and is_nearby) then raise exception 'FAIL persisted assessment'; end if;
end; $$;

-- Worker A can answer their completed work. Worker B cannot see or edit A's data.
reset role;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',worker1,'role','authenticated')::text from test_ids),true);
set local role authenticated;
insert into public.wage_payment_responses(introduction_id,worker_id,response,response_note,responded_at) select i1,w1,'not_paid','시연용 예시 첫 응답','2000-01-01' from test_ids;
update public.wage_payment_responses set response='paid',response_note='시연용 예시 수정 응답' where introduction_id=(select i1 from test_ids);
do $$ begin
  if not exists(select 1 from public.wage_payment_responses where introduction_id=(select i1 from test_ids) and response='paid' and responded_at>now()-interval '1 minute') then raise exception 'FAIL wage persistence/timestamp'; end if;
  if (select count(*) from public.wage_response_events where introduction_id=(select i1 from test_ids))<>2 then raise exception 'FAIL wage history'; end if;
  if jsonb_array_length(public.employment_cases())<>1 then raise exception 'FAIL worker projection isolation'; end if;
  begin
    perform * from private.commute_locations;
    raise sqlstate 'ZX001' using message='FAIL precise location exposed';
  exception when insufficient_privilege then null; end;
end; $$;
insert into public.workflow_demo_runs(owner_profile_id,demo_employer_id,demo_worker_id,matching_reason,work_ended,wage_response)
  select worker1,(select min(id) from public.demo_employers),(select min(id) from public.demo_workers),'시연용 예시 저장 검증',true,'not_paid' from test_ids;
do $$ begin
  if not exists(select 1 from public.workflow_demo_runs where owner_profile_id=(select worker1 from test_ids) and wage_response='not_paid' and wage_responded_at is not null) then raise exception 'FAIL demo save/read'; end if;
  begin
    update public.workflow_demo_runs set contract_status='confirmed' where owner_profile_id=(select worker1 from test_ids);
    raise sqlstate 'ZX001' using message='FAIL demo contract fabricated as confirmed';
  exception when check_violation then null; end;
end; $$;
reset role;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',worker2,'role','authenticated')::text from test_ids),true);
set local role authenticated;
do $$ declare n integer; begin
  if exists(select 1 from public.contract_confirmations where introduction_id=(select i1 from test_ids)) or exists(select 1 from public.wage_payment_responses where introduction_id=(select i1 from test_ids)) or exists(select 1 from public.workflow_demo_runs where owner_profile_id=(select worker1 from test_ids)) then raise exception 'FAIL unrelated worker read'; end if;
  update public.wage_payment_responses set response='not_paid' where introduction_id=(select i1 from test_ids);get diagnostics n=row_count;
  if n<>0 then raise exception 'FAIL unrelated wage modification'; end if;
  begin
    insert into public.wage_payment_responses(introduction_id,worker_id,response) select i2,w2,'paid' from test_ids;
    raise sqlstate 'ZX001' using message='FAIL wage before work ended';
  exception when sqlstate 'P0001' then null; end;
  begin
    insert into public.wage_payment_responses(introduction_id,worker_id,response) select i1,w2,'paid' from test_ids;
    raise sqlstate 'ZX001' using message='FAIL wrong case worker';
  exception when sqlstate 'P0001' then null; end;
end; $$;
reset role;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',employer1,'role','authenticated')::text from test_ids),true);
set local role authenticated;
do $$ declare n integer; begin
  if (select count(*) from public.wage_payment_responses)<>1 then raise exception 'FAIL employer own wage read'; end if;
  if jsonb_array_length(public.employment_cases())<>1 then raise exception 'FAIL employer projection isolation'; end if;
  update public.wage_payment_responses set response='not_paid';get diagnostics n=row_count;
  if n<>0 then raise exception 'FAIL employer changed worker answer'; end if;
  update public.contract_confirmations set status='pending';get diagnostics n=row_count;
  if n<>0 then raise exception 'FAIL employer changed contract'; end if;
end; $$;
reset role;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',employer2,'role','authenticated')::text from test_ids),true);
set local role authenticated;
do $$ begin
  if exists(select 1 from public.wage_payment_responses where introduction_id=(select i1 from test_ids)) or exists(select 1 from public.contract_confirmations where introduction_id=(select i1 from test_ids)) then raise exception 'FAIL unrelated employer read'; end if;
  begin
    perform public.preview_commute((select j1 from test_ids),(select w1 from test_ids),1);
    raise sqlstate 'ZX001' using message='FAIL employer used admin distance function';
  exception when sqlstate 'P0001' then null; end;
end; $$;
reset role;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',worker1,'role','authenticated')::text from test_ids),true);
set local role authenticated;
do $$ declare r jsonb; begin
  begin
    perform public.save_commute_location((select j1 from test_ids),(select w2 from test_ids),0.005,0,'TEST_ONLY');
    raise sqlstate 'ZX001' using message='FAIL write another worker location';
  exception when sqlstate 'P0001' then null; end;
  begin
    perform public.save_commute_location((select j1 from test_ids),(select w1 from test_ids),0.005,0,null);
    raise sqlstate 'ZX001' using message='FAIL location saved without current consent';
  exception when sqlstate 'P0001' then null; end;
  begin
    update public.workers set is_test_data=false where id=(select w1 from test_ids);
    raise sqlstate 'ZX001' using message='FAIL user reclassified test data';
  exception when sqlstate 'P0001' then null; end;
  begin
    update public.workers set latitude=0.005,longitude=0 where id=(select w1 from test_ids);
    raise sqlstate 'ZX001' using message='FAIL public coordinate bypass';
  exception when sqlstate 'P0001' then null; end;
  r:=public.save_commute_location((select j1 from test_ids),(select w1 from test_ids),0.005,0,'TEST_ONLY');
  if (r->>'expires_at')::timestamptz is distinct from now()+interval '90 days' then raise exception 'FAIL 90 day retention'; end if;
  if (public.employment_cases()->0->'own_location'->>'latitude')::numeric is distinct from 0.005 then raise exception 'FAIL saved location reload'; end if;
  if public.employment_cases()->0->'commute'->>'distance_method' is distinct from 'straight_line_haversine' then raise exception 'FAIL automatic straight line calculation'; end if;
  if (public.employment_cases()->0->'commute'->>'distance_km')::numeric is null then raise exception 'FAIL automatic distance result'; end if;
  if public.employment_cases()->0->'commute'->>'status' is distinct from 'configuration_required' then raise exception 'FAIL threshold is not invented'; end if;
  r:=public.save_personal_location(0.006,0,false);
  if (r->>'expires_at')::timestamptz is distinct from now()+interval '90 days' then raise exception 'FAIL personal location retention'; end if;
  r:=public.personal_location_status();
  if (r->>'saved')::boolean is not true or r ? 'latitude' or r ? 'longitude' then raise exception 'FAIL private personal location projection'; end if;
end; $$;
reset role;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',admin,'role','authenticated')::text from test_ids),true);
set local role authenticated;
select public.assess_introduction_commute((select i1 from test_ids),1);
reset role;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',employer1,'role','authenticated')::text from test_ids),true);
set local role authenticated;
do $$ declare r jsonb; begin
  r:=public.employment_cases()->0;
  if (r->'commute'->>'is_nearby')::boolean is distinct from true then raise exception 'FAIL employer distance sharing'; end if;
  if (r->'own_location'->>'latitude')::numeric is distinct from 0 then raise exception 'FAIL employer saw worker coordinate'; end if;
end; $$;
reset role;
-- Expiry blocks access immediately, even before the scheduled cleanup deletes rows.
update private.commute_locations set consented_at=now()-interval '91 days',expires_at=now()-interval '1 day' where worker_id=(select w1 from test_ids);
set local role authenticated;
do $$ begin
  if (public.employment_cases()->0->'commute'->>'distance_km') is not null then raise exception 'FAIL expired distance shared'; end if;
end; $$;
reset role;
do $$ begin
  if private.purge_expired_commute_locations()<>1 then raise exception 'FAIL expiry deletion'; end if;
  if exists(select 1 from private.commute_locations where worker_id=(select w1 from test_ids)) then raise exception 'FAIL expired coordinate remains'; end if;
end; $$;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',worker1,'role','authenticated')::text from test_ids),true);
set local role authenticated;
select public.save_commute_location((select j1 from test_ids),(select w1 from test_ids),0.005,0,'TEST_ONLY');
select public.save_commute_location((select j1 from test_ids),(select w1 from test_ids),null,null,null,true);
reset role;
select set_config('request.jwt.claims',(select jsonb_build_object('sub',admin,'role','authenticated')::text from test_ids),true);
set local role authenticated;
do $$ begin
  if (public.preview_commute((select j1 from test_ids),(select w1 from test_ids),1)->>'distance_km') is not null then raise exception 'FAIL revoked consent still used'; end if;
  if exists(select 1 from public.commute_assessments where introduction_id=(select i1 from test_ids) and is_nearby is not null) then raise exception 'FAIL revoked distance retained'; end if;
  if exists(select 1 from public.employer_access_controls where employer_id=(select e1 from test_ids)) then raise exception 'FAIL wage response auto blocked employer'; end if;
end; $$;
reset role;
rollback;
select 'PASS: manual selection; contract proof/payment gates; wage persistence/history; worker/employer isolation; demo isolation; inside/outside/boundary/missing/revoked location; consented save/reload; 90-day expiry and deletion; distance-only sharing. All fixtures rolled back.' as result;
