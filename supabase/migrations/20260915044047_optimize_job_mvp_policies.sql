create index job_contacts_consent_record_id_idx on public.job_contacts(consent_record_id);
create index job_applications_consent_record_id_idx on public.job_applications(consent_record_id);
create index service_intents_consent_record_id_idx on public.service_intents(consent_record_id);

drop policy "employers manage job contacts" on public.job_contacts;
drop policy "workers read contacts after applying" on public.job_contacts;

create policy "participants read job contacts" on public.job_contacts for select to authenticated
  using (
    exists (
      select 1 from public.employers e
      where e.id = employer_id and e.profile_id = (select auth.uid())
    )
    or exists (
      select 1
      from public.job_applications a
      join public.workers w on w.id = a.worker_id
      where a.job_posting_id = job_posting_id and w.profile_id = (select auth.uid())
    )
  );

create policy "employers create job contacts" on public.job_contacts for insert to authenticated
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

create policy "employers update job contacts" on public.job_contacts for update to authenticated
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

drop policy "workers withdraw applications" on public.job_applications;
drop policy "employers review applications" on public.job_applications;
revoke update on public.job_applications from authenticated;
grant update (status, updated_at) on public.job_applications to authenticated;

create policy "participants update application status" on public.job_applications for update to authenticated
  using (
    exists (select 1 from public.workers w where w.id = worker_id and w.profile_id = (select auth.uid()))
    or exists (
      select 1 from public.job_postings j
      join public.employers e on e.id = j.employer_id
      where j.id = job_posting_id and e.profile_id = (select auth.uid())
    )
  )
  with check (
    (
      status = 'withdrawn'
      and exists (select 1 from public.workers w where w.id = worker_id and w.profile_id = (select auth.uid()))
    )
    or (
      status in ('submitted', 'reviewed')
      and exists (
        select 1 from public.job_postings j
        join public.employers e on e.id = j.employer_id
        where j.id = job_posting_id and e.profile_id = (select auth.uid())
      )
    )
  );
