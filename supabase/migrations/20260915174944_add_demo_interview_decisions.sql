alter table public.demo_interview_requests
drop constraint demo_interview_requests_status_check;

alter table public.demo_interview_requests
add constraint demo_interview_requests_status_check
check (status in ('requested', 'accepted', 'declined'));

alter table public.demo_interview_requests
add column responded_by uuid references auth.users(id) on delete set null,
add column responded_at timestamptz;

revoke update on table public.demo_interview_requests from authenticated;
grant update (status, responded_by, responded_at)
on public.demo_interview_requests to authenticated;
grant select (responded_at)
on public.demo_interview_requests to authenticated;

create policy "employers decide pending demo interview requests"
on public.demo_interview_requests
for update
to authenticated
using (
  status = 'requested'
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('employer', 'admin')
  )
)
with check (
  status in ('accepted', 'declined')
  and responded_by = (select auth.uid())
  and responded_at is not null
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('employer', 'admin')
  )
);
