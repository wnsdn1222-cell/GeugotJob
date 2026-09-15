-- Job-information-provider MVP. Production operation stays locked until the
-- required business notification is verified by an administrator.

create table private.platform_settings (
  singleton boolean primary key default true check (singleton),
  job_information_operations_enabled boolean not null default false,
  registration_verified_at timestamptz,
  updated_at timestamptz not null default now(),
  check (not job_information_operations_enabled or registration_verified_at is not null)
);

insert into private.platform_settings (singleton) values (true);

create function private.job_information_operations_enabled()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce((
    select s.job_information_operations_enabled
    from private.platform_settings s
    where s.singleton = true
  ), false);
$$;

revoke all on function private.job_information_operations_enabled() from public, anon;
grant execute on function private.job_information_operations_enabled() to authenticated;

create table public.consent_records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  consent_type text not null check (consent_type in (
    'profile_storage', 'application_sharing', 'employer_contact_disclosure', 'service_intent'
  )),
  document_version text not null check (length(trim(document_version)) between 1 and 80),
  is_draft boolean not null default true,
  operating_mode text not null default 'development'
    check (operating_mode in ('development', 'production')),
  agreed_at timestamptz not null default now(),
  withdrawn_at timestamptz,
  created_at timestamptz not null default now(),
  check (withdrawn_at is null or withdrawn_at >= agreed_at)
);

create index consent_records_user_type_idx
  on public.consent_records(user_id, consent_type, agreed_at desc)
  where withdrawn_at is null;

create function private.has_active_consent(required_type text)
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1
    from public.consent_records c
    where c.user_id = (select auth.uid())
      and c.consent_type = required_type
      and c.withdrawn_at is null
      and (
        c.operating_mode = 'development'
        or (c.operating_mode = 'production' and (select private.job_information_operations_enabled()))
      )
  );
$$;

revoke all on function private.has_active_consent(text) from public, anon;
grant execute on function private.has_active_consent(text) to authenticated;

alter table public.workers
  add column contact_email text,
  add column contact_phone text,
  add column experience_summary text,
  add column desired_conditions text;

alter table public.employers
  add column contact_name text,
  add column contact_email text,
  add column contact_phone text,
  add column workplace_address text,
  add column updated_at timestamptz not null default now();

alter table public.job_postings
  add column company_name text,
  add column workplace_address text,
  add column employment_type text,
  add column work_days text,
  add column work_hours text,
  add column wage_type text not null default 'hourly'
    check (wage_type in ('hourly', 'daily', 'monthly', 'annual', 'negotiable')),
  add column wage_amount integer check (wage_amount is null or wage_amount >= 0),
  add column wage_notes text,
  add column publication_status text not null default 'draft'
    check (publication_status in ('draft', 'published', 'closed')),
  add column actual_conditions_confirmed boolean not null default false,
  add column operating_mode text not null default 'development'
    check (operating_mode in ('development', 'production')),
  add column published_at timestamptz,
  add constraint job_postings_publish_requires_conditions
    check (publication_status <> 'published' or actual_conditions_confirmed),
  add constraint job_postings_valid_dates
    check (ends_on is null or starts_on is null or ends_on >= starts_on);

create index job_postings_worker_browse_idx
  on public.job_postings(publication_status, operating_mode, created_at desc)
  where is_active = true;

create table public.job_contacts (
  job_posting_id uuid primary key references public.job_postings(id) on delete cascade,
  employer_id uuid not null references public.employers(id) on delete cascade,
  contact_name text not null check (length(trim(contact_name)) between 1 and 80),
  contact_email text,
  contact_phone text,
  preferred_channel text not null default 'email' check (preferred_channel in ('email', 'phone')),
  consent_record_id uuid not null references public.consent_records(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (nullif(trim(contact_email), '') is not null or nullif(trim(contact_phone), '') is not null)
);

create index job_contacts_employer_id_idx on public.job_contacts(employer_id);

create table public.job_applications (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid not null references public.job_postings(id) on delete cascade,
  worker_id uuid not null references public.workers(id) on delete cascade,
  message text check (message is null or length(message) <= 2000),
  contact_email text,
  contact_phone text,
  status text not null default 'submitted' check (status in ('submitted', 'reviewed', 'withdrawn')),
  consent_record_id uuid not null references public.consent_records(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_posting_id, worker_id),
  check (nullif(trim(contact_email), '') is not null or nullif(trim(contact_phone), '') is not null)
);

create index job_applications_worker_created_idx on public.job_applications(worker_id, created_at desc);
create index job_applications_job_created_idx on public.job_applications(job_posting_id, created_at desc);

create table public.contact_events (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.job_applications(id) on delete cascade,
  channel text not null check (channel in ('email', 'phone')),
  created_at timestamptz not null default now()
);

create index contact_events_application_created_idx on public.contact_events(application_id, created_at desc);

create table public.service_intents (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  audience text not null check (audience in ('worker', 'employer')),
  needs text not null check (length(trim(needs)) between 1 and 2000),
  usage_intent text not null check (usage_intent in ('considering', 'likely', 'ready')),
  preferred_contact text not null check (preferred_contact in ('email', 'phone', 'none')),
  consent_record_id uuid not null references public.consent_records(id),
  operating_mode text not null default 'development'
    check (operating_mode in ('development', 'production')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index service_intents_user_created_idx on public.service_intents(user_id, created_at desc);

alter table public.consent_records enable row level security;
alter table public.job_contacts enable row level security;
alter table public.job_applications enable row level security;
alter table public.contact_events enable row level security;
alter table public.service_intents enable row level security;

revoke all on table public.consent_records, public.job_contacts, public.job_applications,
  public.contact_events, public.service_intents from anon, authenticated;

grant select, insert on public.consent_records to authenticated;
grant update (withdrawn_at) on public.consent_records to authenticated;
grant select, insert, update on public.job_contacts, public.job_applications to authenticated;
grant select, insert on public.contact_events to authenticated;
grant select, insert, update on public.service_intents to authenticated;

create policy "users read own consents" on public.consent_records for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "users record own consents" on public.consent_records for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (operating_mode = 'development' or (select private.job_information_operations_enabled()))
  );
create policy "users withdraw own consents" on public.consent_records for update to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

drop policy "workers create own record" on public.workers;
drop policy "workers update own record" on public.workers;
create policy "workers create own record" on public.workers for insert to authenticated
  with check (
    (select auth.uid()) = profile_id
    and (select private.has_active_consent('profile_storage'))
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'worker')
  );
create policy "workers update own record" on public.workers for update to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id and (select private.has_active_consent('profile_storage')));

drop policy "employers create own company" on public.employers;
drop policy "employers update own company" on public.employers;
create policy "employers create own company" on public.employers for insert to authenticated
  with check (
    (select auth.uid()) = profile_id
    and (select private.has_active_consent('profile_storage'))
    and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'employer')
  );
create policy "employers update own company" on public.employers for update to authenticated
  using ((select auth.uid()) = profile_id)
  with check ((select auth.uid()) = profile_id and (select private.has_active_consent('profile_storage')));

drop policy "participants read jobs" on public.job_postings;
drop policy "employers create own jobs" on public.job_postings;
drop policy "employers update own jobs" on public.job_postings;
create policy "participants read jobs" on public.job_postings for select to authenticated
  using (
    exists (
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
create policy "employers create own jobs" on public.job_postings for insert to authenticated
  with check (
    exists (select 1 from public.employers e where e.id = employer_id and e.profile_id = (select auth.uid()))
    and (select private.has_active_consent('employer_contact_disclosure'))
    and (operating_mode = 'development' or (select private.job_information_operations_enabled()))
  );
create policy "employers update own jobs" on public.job_postings for update to authenticated
  using (exists (
    select 1 from public.employers e where e.id = employer_id and e.profile_id = (select auth.uid())
  ))
  with check (
    exists (select 1 from public.employers e where e.id = employer_id and e.profile_id = (select auth.uid()))
    and (select private.has_active_consent('employer_contact_disclosure'))
    and (operating_mode = 'development' or (select private.job_information_operations_enabled()))
  );

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
    and (select private.has_active_consent('employer_contact_disclosure'))
  );
create policy "workers read contacts after applying" on public.job_contacts for select to authenticated
  using (exists (
    select 1
    from public.job_applications a
    join public.workers w on w.id = a.worker_id
    where a.job_posting_id = job_posting_id and w.profile_id = (select auth.uid())
  ));

create policy "participants read applications" on public.job_applications for select to authenticated
  using (
    exists (select 1 from public.workers w where w.id = worker_id and w.profile_id = (select auth.uid()))
    or exists (
      select 1 from public.job_postings j
      join public.employers e on e.id = j.employer_id
      where j.id = job_posting_id and e.profile_id = (select auth.uid())
    )
  );
create policy "workers create applications" on public.job_applications for insert to authenticated
  with check (
    exists (select 1 from public.workers w where w.id = worker_id and w.profile_id = (select auth.uid()))
    and (select private.has_active_consent('application_sharing'))
    and exists (
      select 1 from public.job_postings j
      where j.id = job_posting_id
        and j.is_active = true
        and j.publication_status = 'published'
        and (j.operating_mode = 'development' or (select private.job_information_operations_enabled()))
    )
  );
create policy "workers withdraw applications" on public.job_applications for update to authenticated
  using (exists (
    select 1 from public.workers w where w.id = worker_id and w.profile_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.workers w where w.id = worker_id and w.profile_id = (select auth.uid())
  ));
create policy "employers review applications" on public.job_applications for update to authenticated
  using (exists (
    select 1 from public.job_postings j
    join public.employers e on e.id = j.employer_id
    where j.id = job_posting_id and e.profile_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.job_postings j
    join public.employers e on e.id = j.employer_id
    where j.id = job_posting_id and e.profile_id = (select auth.uid())
  ));

create policy "participants read contact events" on public.contact_events for select to authenticated
  using (exists (
    select 1
    from public.job_applications a
    left join public.workers w on w.id = a.worker_id
    left join public.job_postings j on j.id = a.job_posting_id
    left join public.employers e on e.id = j.employer_id
    where a.id = application_id
      and (w.profile_id = (select auth.uid()) or e.profile_id = (select auth.uid()))
  ));
create policy "workers log direct contact" on public.contact_events for insert to authenticated
  with check (exists (
    select 1 from public.job_applications a
    join public.workers w on w.id = a.worker_id
    where a.id = application_id and w.profile_id = (select auth.uid())
  ));

create policy "users read own service intents" on public.service_intents for select to authenticated
  using ((select auth.uid()) = user_id);
create policy "users create own service intents" on public.service_intents for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and (select private.has_active_consent('service_intent'))
    and (operating_mode = 'development' or (select private.job_information_operations_enabled()))
  );
create policy "users update own service intents" on public.service_intents for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and (select private.has_active_consent('service_intent'))
    and (operating_mode = 'development' or (select private.job_information_operations_enabled()))
  );
