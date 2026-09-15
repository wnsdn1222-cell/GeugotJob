create table public.demo_interview_requests (
  id uuid primary key default gen_random_uuid(),
  demo_employer_code text not null references public.demo_employers(demo_code),
  restaurant_name text not null,
  industry text not null,
  interview_date date not null,
  interview_time time not null,
  interview_method text not null check (interview_method in ('매장 방문', '전화 면접', '영상 면접')),
  status text not null default 'requested' check (status = 'requested'),
  created_by uuid not null references auth.users(id) on delete cascade,
  data_label text not null default '시연용 가상 데이터' check (data_label = '시연용 가상 데이터'),
  created_at timestamptz not null default now()
);

create index demo_interview_requests_created_at_idx
on public.demo_interview_requests(created_at desc);

alter table public.demo_interview_requests enable row level security;
revoke all on table public.demo_interview_requests from anon, authenticated;
grant select (
  id, demo_employer_code, restaurant_name, industry, interview_date,
  interview_time, interview_method, status, data_label, created_at
) on public.demo_interview_requests to authenticated;
grant insert (
  demo_employer_code, restaurant_name, industry, interview_date,
  interview_time, interview_method, created_by
) on public.demo_interview_requests to authenticated;

create policy "workers create demo interview requests"
on public.demo_interview_requests
for insert
to authenticated
with check (
  (select auth.uid()) = created_by
  and exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role = 'worker'
  )
);

create policy "members read permitted demo interview requests"
on public.demo_interview_requests
for select
to authenticated
using (
  (select auth.uid()) = created_by
  or exists (
    select 1 from public.profiles
    where id = (select auth.uid()) and role in ('employer', 'admin')
  )
);
