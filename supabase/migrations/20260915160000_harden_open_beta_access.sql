-- Keep exposed RPCs security-invoker and consolidate overlapping read policies.

alter function public.calculate_commute_assessment(uuid) set schema private;
alter function public.get_open_beta_readiness() set schema private;

revoke all on function private.calculate_commute_assessment(uuid) from public, anon;
grant execute on function private.calculate_commute_assessment(uuid) to authenticated;
revoke all on function private.get_open_beta_readiness() from public, anon;
grant execute on function private.get_open_beta_readiness() to authenticated;

create function public.calculate_commute_assessment(p_introduction_id uuid)
returns public.commute_assessments
language sql
security invoker
set search_path = ''
as $$
  select private.calculate_commute_assessment(p_introduction_id);
$$;

create function public.get_open_beta_readiness()
returns jsonb
language sql
security invoker
stable
set search_path = ''
as $$
  select private.get_open_beta_readiness();
$$;

revoke all on function public.calculate_commute_assessment(uuid) from public, anon;
grant execute on function public.calculate_commute_assessment(uuid) to authenticated;
revoke all on function public.get_open_beta_readiness() from public, anon;
grant execute on function public.get_open_beta_readiness() to authenticated;

create index employer_access_controls_decided_by_idx
  on public.employer_access_controls(decided_by) where decided_by is not null;

drop policy "admins manage commute assessments" on public.commute_assessments;
drop policy "participants read own commute assessments" on public.commute_assessments;
create policy "authorized users read commute assessments" on public.commute_assessments for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.manual_introductions i
      left join public.workers w on w.id = i.worker_id
      left join public.job_postings j on j.id = i.job_posting_id
      left join public.employers e on e.id = j.employer_id
      where i.id = introduction_id and (w.profile_id = (select auth.uid()) or e.profile_id = (select auth.uid()))
    )
  );
create policy "admins insert commute assessments" on public.commute_assessments for insert to authenticated
  with check ((select private.is_admin()) and assessed_by = (select auth.uid()));
create policy "admins update commute assessments" on public.commute_assessments for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()) and assessed_by = (select auth.uid()));

drop policy "workers read own wage responses" on public.wage_payment_responses;
drop policy "admins read wage responses" on public.wage_payment_responses;
create policy "authorized users read wage responses" on public.wage_payment_responses for select to authenticated
  using (
    (select private.is_admin())
    or exists (select 1 from public.workers w where w.id = worker_id and w.profile_id = (select auth.uid()))
  );

drop policy "admins manage wage incident reviews" on public.wage_incident_reviews;
drop policy "workers read reviews of own responses" on public.wage_incident_reviews;
create policy "authorized users read wage incident reviews" on public.wage_incident_reviews for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.wage_payment_responses r
      join public.workers w on w.id = r.worker_id
      where r.id = response_id and w.profile_id = (select auth.uid())
    )
  );
create policy "admins insert wage incident reviews" on public.wage_incident_reviews for insert to authenticated
  with check ((select private.is_admin()));
create policy "admins update wage incident reviews" on public.wage_incident_reviews for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy "admins manage employer access" on public.employer_access_controls;
drop policy "employers read own access" on public.employer_access_controls;
create policy "authorized users read employer access" on public.employer_access_controls for select to authenticated
  using (
    (select private.is_admin())
    or exists (select 1 from public.employers e where e.id = employer_id and e.profile_id = (select auth.uid()))
  );
create policy "admins insert employer access" on public.employer_access_controls for insert to authenticated
  with check ((select private.is_admin()));
create policy "admins update employer access" on public.employer_access_controls for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy "admins manage fee payment records" on public.fee_payment_records;
drop policy "payers read own fee payment records" on public.fee_payment_records;
create policy "authorized users read fee payment records" on public.fee_payment_records for select to authenticated
  using ((select private.is_admin()) or payer_profile_id = (select auth.uid()));
create policy "admins insert fee payment records" on public.fee_payment_records for insert to authenticated
  with check ((select private.is_admin()) and recorded_by = (select auth.uid()));
create policy "admins update fee payment records" on public.fee_payment_records for update to authenticated
  using ((select private.is_admin())) with check ((select private.is_admin()) and recorded_by = (select auth.uid()));

drop policy "users read own reuse intentions" on public.reuse_intentions;
drop policy "admins read reuse intentions" on public.reuse_intentions;
create policy "authorized users read reuse intentions" on public.reuse_intentions for select to authenticated
  using ((select private.is_admin()) or profile_id = (select auth.uid()));

