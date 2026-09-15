alter table public.job_applications
  add column applicant_name text not null default '' check (length(trim(applicant_name)) between 1 and 80);

create function private.set_application_identity_snapshot()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select p.full_name into new.applicant_name
  from public.profiles p
  join public.workers w on w.profile_id = p.id
  where p.id = (select auth.uid()) and w.id = new.worker_id;

  if nullif(trim(new.applicant_name), '') is null then
    raise exception '근로자 이름을 먼저 등록해 주세요.';
  end if;

  if not exists (
    select 1
    from public.consent_records c
    where c.id = new.consent_record_id
      and c.user_id = (select auth.uid())
      and c.consent_type = 'application_sharing'
      and c.withdrawn_at is null
  ) then
    raise exception '유효한 지원 정보 제공 동의가 필요합니다.';
  end if;

  return new;
end;
$$;

revoke all on function private.set_application_identity_snapshot() from public, anon, authenticated;

create trigger set_application_identity_snapshot
  before insert on public.job_applications
  for each row execute procedure private.set_application_identity_snapshot();

drop policy "employers manage job contacts" on public.job_contacts;
create policy "employers manage job contacts" on public.job_contacts for all to authenticated
  using (exists (
    select 1 from public.employers e where e.id = employer_id and e.profile_id = (select auth.uid())
  ))
  with check (
    exists (
      select 1 from public.employers e
      join public.job_postings j on j.employer_id = e.id
      where e.id = employer_id and j.id = job_posting_id and e.profile_id = (select auth.uid())
    )
    and exists (
      select 1 from public.consent_records c
      where c.id = consent_record_id
        and c.user_id = (select auth.uid())
        and c.consent_type = 'employer_contact_disclosure'
        and c.withdrawn_at is null
    )
  );

drop policy "workers create applications" on public.job_applications;
create policy "workers create applications" on public.job_applications for insert to authenticated
  with check (
    exists (select 1 from public.workers w where w.id = worker_id and w.profile_id = (select auth.uid()))
    and exists (
      select 1 from public.consent_records c
      where c.id = consent_record_id
        and c.user_id = (select auth.uid())
        and c.consent_type = 'application_sharing'
        and c.withdrawn_at is null
    )
    and exists (
      select 1 from public.job_postings j
      where j.id = job_posting_id
        and j.is_active = true
        and j.publication_status = 'published'
        and (j.operating_mode = 'development' or (select private.job_information_operations_enabled()))
    )
  );

drop policy "users create own service intents" on public.service_intents;
create policy "users create own service intents" on public.service_intents for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and exists (
      select 1 from public.consent_records c
      where c.id = consent_record_id
        and c.user_id = (select auth.uid())
        and c.consent_type = 'service_intent'
        and c.withdrawn_at is null
    )
    and (operating_mode = 'development' or (select private.job_information_operations_enabled()))
  );
