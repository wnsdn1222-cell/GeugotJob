create index reservations_match_id_idx on public.reservations(match_id) where match_id is not null;

drop policy "workers read own record" on public.workers;
drop policy "employers see matched workers" on public.workers;
create policy "participants read workers" on public.workers for select to authenticated
  using (
    (select auth.uid()) = profile_id
    or (select private.employer_can_view_worker(id))
  );

drop policy "employers read own jobs" on public.job_postings;
drop policy "workers read active jobs" on public.job_postings;
create policy "participants read jobs" on public.job_postings for select to authenticated
  using (
    is_active = true
    or exists (
      select 1 from public.employers e
      where e.id = employer_id and e.profile_id = (select auth.uid())
    )
  );
