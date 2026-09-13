create extension if not exists pgcrypto;

create type public.account_role as enum ('worker', 'employer', 'admin');
create type public.match_status as enum ('recommended', 'shortlisted', 'interview', 'hired', 'passed');
create type public.withdrawal_status as enum ('requested', 'reviewing', 'paid', 'rejected');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.account_role not null default 'worker',
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.workers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  nationality text not null default '대한민국',
  visa_type text,
  visa_expires_on date,
  job_category text not null,
  city text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  experience_months integer not null default 0 check (experience_months >= 0),
  availability_date date,
  reliability_score smallint check (reliability_score between 0 and 100),
  communication_score smallint check (communication_score between 0 and 100),
  skill_score smallint check (skill_score between 0 and 100),
  attendance_rate numeric(5, 2) check (attendance_rate between 0 and 100),
  is_profile_visible boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.employers (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null unique references public.profiles(id) on delete cascade,
  company_name text not null,
  business_number text,
  city text,
  is_verified boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.job_postings (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers(id) on delete cascade,
  title text not null,
  job_category text not null,
  city text not null,
  latitude numeric(9, 6),
  longitude numeric(9, 6),
  starts_on date,
  ends_on date,
  headcount integer not null default 1 check (headcount > 0),
  hourly_wage integer check (hourly_wage >= 0),
  description text,
  requirements jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.matches (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid not null references public.job_postings(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  score smallint not null check (score between 0 and 100),
  distance_km numeric(7, 2) check (distance_km >= 0),
  status public.match_status not null default 'recommended',
  explanation jsonb not null default '{}'::jsonb,
  model_version text,
  employer_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(job_posting_id, worker_id)
);

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount <> 0),
  reason text not null,
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now()
);

create table public.withdrawal_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount integer not null check (amount >= 15000),
  status public.withdrawal_status not null default 'requested',
  bank_name text,
  account_last4 text check (account_last4 is null or length(account_last4) = 4),
  requested_at timestamptz not null default now(),
  processed_at timestamptz
);

create table public.visa_support_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  request_type text not null check (request_type in ('eligibility', 'working_holiday', 'short_term_visa', 'other')),
  message text,
  status text not null default 'requested' check (status in ('requested', 'consulting', 'completed', 'closed')),
  created_at timestamptz not null default now()
);

create index workers_profile_id_idx on public.workers(profile_id);
create index employers_profile_id_idx on public.employers(profile_id);
create index job_postings_employer_id_idx on public.job_postings(employer_id);
create index matches_job_posting_id_idx on public.matches(job_posting_id);
create index matches_worker_id_idx on public.matches(worker_id);
create index points_ledger_user_id_idx on public.points_ledger(user_id);
create index withdrawal_requests_user_id_idx on public.withdrawal_requests(user_id);
create index visa_support_requests_user_id_idx on public.visa_support_requests(user_id);

alter table public.profiles enable row level security;
alter table public.workers enable row level security;
alter table public.employers enable row level security;
alter table public.job_postings enable row level security;
alter table public.matches enable row level security;
alter table public.points_ledger enable row level security;
alter table public.withdrawal_requests enable row level security;
alter table public.visa_support_requests enable row level security;

revoke all on table public.profiles, public.workers, public.employers, public.job_postings,
  public.matches, public.points_ledger, public.withdrawal_requests, public.visa_support_requests
from anon, authenticated;

grant select on public.profiles, public.workers, public.employers, public.job_postings,
  public.matches, public.points_ledger, public.withdrawal_requests, public.visa_support_requests
to authenticated;
grant insert on public.workers, public.employers, public.job_postings, public.withdrawal_requests, public.visa_support_requests to authenticated;
grant update on public.workers, public.employers, public.job_postings to authenticated;
grant update (full_name, phone, avatar_url, updated_at) on public.profiles to authenticated;
grant update (status, employer_notes, updated_at) on public.matches to authenticated;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.employer_can_view_worker(target_worker_id uuid)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.matches m
    join public.job_postings j on j.id = m.job_posting_id
    join public.employers e on e.id = j.employer_id
    where m.worker_id = target_worker_id
      and e.profile_id = (select auth.uid())
  );
$$;

revoke execute on function private.employer_can_view_worker(uuid) from public, anon;
grant usage on schema private to authenticated;
grant execute on function private.employer_can_view_worker(uuid) to authenticated;

create policy "users read own profile" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);
create policy "users update own profile" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "workers read own record" on public.workers for select to authenticated
  using ((select auth.uid()) = profile_id);
create policy "workers create own record" on public.workers for insert to authenticated
  with check ((select auth.uid()) = profile_id and exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'worker'
  ));
create policy "workers update own record" on public.workers for update to authenticated
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);

create policy "employers see matched workers" on public.workers for select to authenticated
  using ((select private.employer_can_view_worker(id)));

create policy "employers read own company" on public.employers for select to authenticated
  using ((select auth.uid()) = profile_id);
create policy "employers create own company" on public.employers for insert to authenticated
  with check ((select auth.uid()) = profile_id and exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'employer'
  ));
create policy "employers update own company" on public.employers for update to authenticated
  using ((select auth.uid()) = profile_id) with check ((select auth.uid()) = profile_id);

create policy "employers read own jobs" on public.job_postings for select to authenticated
  using (exists (select 1 from public.employers e where e.id = employer_id and e.profile_id = (select auth.uid())));
create policy "workers read active jobs" on public.job_postings for select to authenticated using (is_active = true);
create policy "employers create own jobs" on public.job_postings for insert to authenticated
  with check (exists (select 1 from public.employers e where e.id = employer_id and e.profile_id = (select auth.uid())));
create policy "employers update own jobs" on public.job_postings for update to authenticated
  using (exists (select 1 from public.employers e where e.id = employer_id and e.profile_id = (select auth.uid())))
  with check (exists (select 1 from public.employers e where e.id = employer_id and e.profile_id = (select auth.uid())));

create policy "participants read matches" on public.matches for select to authenticated
  using (
    exists (select 1 from public.workers w where w.id = worker_id and w.profile_id = (select auth.uid()))
    or exists (
      select 1 from public.job_postings j join public.employers e on e.id = j.employer_id
      where j.id = job_posting_id and e.profile_id = (select auth.uid())
    )
  );
create policy "employers update match decision" on public.matches for update to authenticated
  using (exists (
    select 1 from public.job_postings j join public.employers e on e.id = j.employer_id
    where j.id = job_posting_id and e.profile_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.job_postings j join public.employers e on e.id = j.employer_id
    where j.id = job_posting_id and e.profile_id = (select auth.uid())
  ));

create policy "users read own point ledger" on public.points_ledger for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "users read own withdrawals" on public.withdrawal_requests for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "users request own withdrawal" on public.withdrawal_requests for insert to authenticated
  with check ((select auth.uid()) = user_id and amount >= 15000);
create policy "users read own visa requests" on public.visa_support_requests for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "users create own visa requests" on public.visa_support_requests for insert to authenticated
  with check ((select auth.uid()) = user_id);

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''));
  return new;
end;
$$;

revoke execute on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure private.handle_new_user();
