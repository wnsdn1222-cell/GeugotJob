-- Merge overlapping SELECT policies so each role/action evaluates one policy.

drop policy "users read own profile" on public.profiles;
drop policy "admins read profiles" on public.profiles;
create policy "users or admins read profiles" on public.profiles for select to authenticated
  using ((select auth.uid()) = id or (select private.is_admin()));

drop policy "participants read workers" on public.workers;
drop policy "admins read workers" on public.workers;
create policy "participants or admins read workers" on public.workers for select to authenticated
  using (
    (select auth.uid()) = profile_id
    or (select private.employer_can_view_worker(id))
    or (select private.is_admin())
  );

drop policy "employers read own company" on public.employers;
drop policy "admins read employers" on public.employers;
create policy "owners or admins read employers" on public.employers for select to authenticated
  using ((select auth.uid()) = profile_id or (select private.is_admin()));

drop policy "participants read jobs" on public.job_postings;
drop policy "admins read jobs" on public.job_postings;
create policy "participants or admins read jobs" on public.job_postings for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.employers e
      where e.id = employer_id and e.profile_id = (select auth.uid())
    )
    or (
      is_active = true
      and publication_status = 'published'
      and (operating_mode = 'development' or (select private.job_information_operations_enabled()))
      and exists (
        select 1 from public.profiles p
        where p.id = (select auth.uid()) and p.role = 'worker'
      )
    )
  );

drop policy "admins manage beta participants" on public.closed_beta_participants;
drop policy "participants read own beta membership" on public.closed_beta_participants;
create policy "participants or admins read beta membership" on public.closed_beta_participants
  for select to authenticated
  using (profile_id = (select auth.uid()) or (select private.is_admin()));
create policy "admins insert beta participants" on public.closed_beta_participants
  for insert to authenticated
  with check (
    (select private.is_admin())
    and approved_by = (select auth.uid())
    and (operating_mode = 'development' or (select private.paid_introduction_operations_enabled()))
    and exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.role = participant_role
    )
  );
create policy "admins update beta participants" on public.closed_beta_participants
  for update to authenticated
  using ((select private.is_admin()))
  with check (
    (select private.is_admin())
    and approved_by = (select auth.uid())
    and (operating_mode = 'development' or (select private.paid_introduction_operations_enabled()))
    and exists (
      select 1 from public.profiles p
      where p.id = profile_id and p.role = participant_role
    )
  );

create function private.can_manage_manual_introduction(
  target_job_id uuid,
  target_worker_id uuid,
  target_operator_id uuid,
  target_operating_mode text
)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select
    (select auth.uid()) is not null
    and (select private.is_admin())
    and target_operator_id = (select auth.uid())
    and (
      target_operating_mode = 'development'
      or (select private.paid_introduction_operations_enabled())
    )
    and exists (
      select 1
      from public.job_postings j
      join public.employers e on e.id = j.employer_id
      join public.closed_beta_participants bp on bp.profile_id = e.profile_id
      where j.id = target_job_id and bp.active and bp.participant_role = 'employer'
    )
    and exists (
      select 1
      from public.workers w
      join public.closed_beta_participants bp on bp.profile_id = w.profile_id
      where w.id = target_worker_id and bp.active and bp.participant_role = 'worker'
    );
$$;

revoke all on function private.can_manage_manual_introduction(uuid, uuid, uuid, text) from public, anon;
grant execute on function private.can_manage_manual_introduction(uuid, uuid, uuid, text) to authenticated;

drop policy "admins manage manual introductions" on public.manual_introductions;
drop policy "participants read own introductions" on public.manual_introductions;
create policy "participants or admins read introductions" on public.manual_introductions
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.workers w
      where w.id = worker_id and w.profile_id = (select auth.uid())
    )
    or exists (
      select 1 from public.job_postings j
      join public.employers e on e.id = j.employer_id
      where j.id = job_posting_id and e.profile_id = (select auth.uid())
    )
  );
create policy "admins insert manual introductions" on public.manual_introductions
  for insert to authenticated
  with check ((select private.can_manage_manual_introduction(job_posting_id, worker_id, operator_id, operating_mode)));
create policy "admins update manual introductions" on public.manual_introductions
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.can_manage_manual_introduction(job_posting_id, worker_id, operator_id, operating_mode)));

drop policy "admins manage contract confirmations" on public.contract_confirmations;
drop policy "introduction participants read contract status" on public.contract_confirmations;
create policy "participants or admins read contract status" on public.contract_confirmations
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.manual_introductions i
      left join public.workers w on w.id = i.worker_id
      left join public.job_postings j on j.id = i.job_posting_id
      left join public.employers e on e.id = j.employer_id
      where i.id = introduction_id
        and (w.profile_id = (select auth.uid()) or e.profile_id = (select auth.uid()))
    )
  );
create policy "admins insert contract confirmations" on public.contract_confirmations
  for insert to authenticated
  with check ((select private.is_admin()) and (status <> 'confirmed' or confirmed_by = (select auth.uid())));
create policy "admins update contract confirmations" on public.contract_confirmations
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()) and (status <> 'confirmed' or confirmed_by = (select auth.uid())));

drop policy "admins manage payment preparation" on public.payment_preparations;
drop policy "payer reads payment preparation" on public.payment_preparations;
create policy "payer or admins read payment preparation" on public.payment_preparations
  for select to authenticated
  using (payer_profile_id = (select auth.uid()) or (select private.is_admin()));
create policy "admins insert payment preparation" on public.payment_preparations
  for insert to authenticated with check ((select private.is_admin()));
create policy "admins update payment preparation" on public.payment_preparations
  for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

drop policy "admins manage work outcomes" on public.work_outcomes;
drop policy "introduction participants read work outcomes" on public.work_outcomes;
create policy "participants or admins read work outcomes" on public.work_outcomes
  for select to authenticated
  using (
    (select private.is_admin())
    or exists (
      select 1 from public.manual_introductions i
      left join public.workers w on w.id = i.worker_id
      left join public.job_postings j on j.id = i.job_posting_id
      left join public.employers e on e.id = j.employer_id
      where i.id = introduction_id
        and (w.profile_id = (select auth.uid()) or e.profile_id = (select auth.uid()))
    )
  );
create policy "admins insert work outcomes" on public.work_outcomes
  for insert to authenticated
  with check ((select private.is_admin()) and recorded_by = (select auth.uid()));
create policy "admins update work outcomes" on public.work_outcomes
  for update to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()) and recorded_by = (select auth.uid()));
