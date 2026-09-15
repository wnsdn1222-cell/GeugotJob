-- Closed beta for manual introductions. Paid introduction operations remain
-- disabled until the required registration is explicitly verified.

alter table private.platform_settings
  add column paid_introduction_operations_enabled boolean not null default false,
  add column paid_introduction_registration_verified_at timestamptz,
  add constraint paid_introduction_requires_registration
    check (
      not paid_introduction_operations_enabled
      or paid_introduction_registration_verified_at is not null
    );

create function private.paid_introduction_operations_enabled()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select coalesce((
    select s.paid_introduction_operations_enabled
      and s.paid_introduction_registration_verified_at is not null
    from private.platform_settings s
    where s.singleton = true
  ), false);
$$;

revoke all on function private.paid_introduction_operations_enabled() from public, anon;
grant execute on function private.paid_introduction_operations_enabled() to authenticated;

create function private.is_admin()
returns boolean
language sql
security definer
set search_path = ''
stable
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid()) and p.role = 'admin'
  );
$$;

revoke all on function private.is_admin() from public, anon;
grant execute on function private.is_admin() to authenticated;

create table public.closed_beta_participants (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  participant_role public.account_role not null check (participant_role in ('worker', 'employer')),
  approved_by uuid not null references public.profiles(id),
  active boolean not null default true,
  notes text check (notes is null or length(notes) <= 1000),
  operating_mode text not null default 'development'
    check (operating_mode in ('development', 'production')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index closed_beta_participants_approved_by_idx
  on public.closed_beta_participants(approved_by);

create table public.manual_introductions (
  id uuid primary key default gen_random_uuid(),
  job_posting_id uuid not null references public.job_postings(id) on delete restrict,
  worker_id uuid not null references public.workers(id) on delete restrict,
  operator_id uuid not null references public.profiles(id),
  employer_feedback text check (employer_feedback is null or length(employer_feedback) <= 2000),
  comparison_notes text not null check (length(trim(comparison_notes)) between 1 and 3000),
  selection_reason text check (selection_reason is null or length(trim(selection_reason)) between 1 and 2000),
  conditions_reviewed_at timestamptz not null,
  status text not null default 'draft'
    check (status in ('draft', 'selected', 'introduced', 'closed')),
  operating_mode text not null default 'development'
    check (operating_mode in ('development', 'production')),
  introduced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (job_posting_id, worker_id),
  check (status = 'draft' or selection_reason is not null),
  check (status <> 'introduced' or introduced_at is not null)
);

create index manual_introductions_operator_created_idx
  on public.manual_introductions(operator_id, created_at desc);
create index manual_introductions_worker_created_idx
  on public.manual_introductions(worker_id, created_at desc);

create table public.contract_confirmations (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null unique references public.manual_introductions(id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'submitted', 'confirmed', 'rejected')),
  confirmation_method text check (confirmation_method is null or length(trim(confirmation_method)) between 1 and 500),
  evidence_reference text check (evidence_reference is null or length(evidence_reference) <= 1000),
  confirmed_by uuid references public.profiles(id),
  confirmed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    status <> 'confirmed'
    or (confirmation_method is not null and confirmed_by is not null and confirmed_at is not null)
  )
);

create index contract_confirmations_confirmed_by_idx
  on public.contract_confirmations(confirmed_by)
  where confirmed_by is not null;

create table public.payment_preparations (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null unique references public.manual_introductions(id) on delete cascade,
  payer_profile_id uuid not null references public.profiles(id),
  payment_method_status text not null default 'not_registered'
    check (payment_method_status in ('not_registered', 'test_registered')),
  payment_consent_status text not null default 'not_requested'
    check (payment_consent_status in ('not_requested', 'agreed', 'withdrawn')),
  consented_at timestamptz,
  amount_krw integer not null default 19000 check (amount_krw = 19000),
  price_basis text not null default 'temporary_validation'
    check (price_basis = 'temporary_validation'),
  provider_mode text not null default 'unconnected_test'
    check (provider_mode = 'unconnected_test'),
  charge_status text not null default 'blocked'
    check (charge_status in ('blocked', 'eligible', 'test_completed')),
  test_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    payment_consent_status <> 'agreed'
    or (consented_at is not null and payment_method_status = 'test_registered')
  ),
  check (charge_status <> 'test_completed' or test_completed_at is not null)
);

create index payment_preparations_payer_created_idx
  on public.payment_preparations(payer_profile_id, created_at desc);

create function private.enforce_closed_beta_payment_gate()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
declare
  contract_is_confirmed boolean;
  introduction_mode text;
begin
  if new.charge_status = 'blocked' then
    return new;
  end if;

  select c.status = 'confirmed', i.operating_mode
  into contract_is_confirmed, introduction_mode
  from public.contract_confirmations c
  join public.manual_introductions i on i.id = c.introduction_id
  where c.introduction_id = new.introduction_id;

  if not coalesce(contract_is_confirmed, false) then
    raise exception '계약 체결 확인 전에는 결제 가능 상태로 변경할 수 없습니다.';
  end if;

  if new.payment_method_status <> 'test_registered'
     or new.payment_consent_status <> 'agreed' then
    raise exception '테스트 결제수단 등록과 결제 동의가 필요합니다.';
  end if;

  if introduction_mode = 'production'
     and not (select private.paid_introduction_operations_enabled()) then
    raise exception '유료직업소개사업 등록 확인 전에는 운영 결제를 활성화할 수 없습니다.';
  end if;

  if new.charge_status = 'test_completed' and introduction_mode <> 'development' then
    raise exception '실제 청구가 연결되지 않은 개발 테스트에서만 완료 처리가 가능합니다.';
  end if;

  return new;
end;
$$;

revoke all on function private.enforce_closed_beta_payment_gate() from public, anon, authenticated;

create trigger enforce_closed_beta_payment_gate
  before insert or update on public.payment_preparations
  for each row execute function private.enforce_closed_beta_payment_gate();

create table public.work_outcomes (
  id uuid primary key default gen_random_uuid(),
  introduction_id uuid not null unique references public.manual_introductions(id) on delete cascade,
  attendance_status text not null default 'unknown'
    check (attendance_status in ('unknown', 'attended', 'no_show')),
  first_shift_status text not null default 'unknown'
    check (first_shift_status in ('unknown', 'completed', 'not_completed')),
  contract_outcome text not null default 'unknown'
    check (contract_outcome in ('unknown', 'in_progress', 'completed', 'ended_early')),
  outcome_notes text check (outcome_notes is null or length(outcome_notes) <= 2000),
  recorded_by uuid not null references public.profiles(id),
  recorded_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index work_outcomes_recorded_by_idx on public.work_outcomes(recorded_by);

alter table public.closed_beta_participants enable row level security;
alter table public.manual_introductions enable row level security;
alter table public.contract_confirmations enable row level security;
alter table public.payment_preparations enable row level security;
alter table public.work_outcomes enable row level security;

revoke all on table public.closed_beta_participants, public.manual_introductions,
  public.contract_confirmations, public.payment_preparations, public.work_outcomes
from anon, authenticated;

grant select, insert, update on table public.closed_beta_participants,
  public.manual_introductions, public.contract_confirmations,
  public.payment_preparations, public.work_outcomes to authenticated;

create policy "admins read profiles" on public.profiles for select to authenticated
  using ((select private.is_admin()));
create policy "admins read workers" on public.workers for select to authenticated
  using ((select private.is_admin()));
create policy "admins read employers" on public.employers for select to authenticated
  using ((select private.is_admin()));
create policy "admins read jobs" on public.job_postings for select to authenticated
  using ((select private.is_admin()));

create policy "admins manage beta participants" on public.closed_beta_participants
  for all to authenticated
  using ((select private.is_admin()))
  with check (
    (select private.is_admin())
    and approved_by = (select auth.uid())
    and (operating_mode = 'development' or (select private.paid_introduction_operations_enabled()))
  );

create policy "participants read own beta membership" on public.closed_beta_participants
  for select to authenticated
  using (profile_id = (select auth.uid()));

create policy "admins manage manual introductions" on public.manual_introductions
  for all to authenticated
  using ((select private.is_admin()))
  with check (
    (select private.is_admin())
    and operator_id = (select auth.uid())
    and (
      operating_mode = 'development'
      or (select private.paid_introduction_operations_enabled())
    )
    and exists (
      select 1
      from public.job_postings j
      join public.employers e on e.id = j.employer_id
      join public.closed_beta_participants bp on bp.profile_id = e.profile_id
      where j.id = job_posting_id and bp.active and bp.participant_role = 'employer'
    )
    and exists (
      select 1
      from public.workers w
      join public.closed_beta_participants bp on bp.profile_id = w.profile_id
      where w.id = worker_id and bp.active and bp.participant_role = 'worker'
    )
  );

create policy "participants read own introductions" on public.manual_introductions
  for select to authenticated
  using (
    exists (
      select 1 from public.workers w
      where w.id = worker_id and w.profile_id = (select auth.uid())
    )
    or exists (
      select 1 from public.job_postings j
      join public.employers e on e.id = j.employer_id
      where j.id = job_posting_id and e.profile_id = (select auth.uid())
    )
  );

create policy "admins manage contract confirmations" on public.contract_confirmations
  for all to authenticated
  using ((select private.is_admin()))
  with check (
    (select private.is_admin())
    and (status <> 'confirmed' or confirmed_by = (select auth.uid()))
  );

create policy "introduction participants read contract status" on public.contract_confirmations
  for select to authenticated
  using (exists (
    select 1 from public.manual_introductions i
    left join public.workers w on w.id = i.worker_id
    left join public.job_postings j on j.id = i.job_posting_id
    left join public.employers e on e.id = j.employer_id
    where i.id = introduction_id
      and (w.profile_id = (select auth.uid()) or e.profile_id = (select auth.uid()))
  ));

create policy "admins manage payment preparation" on public.payment_preparations
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()));

create policy "payer reads payment preparation" on public.payment_preparations
  for select to authenticated
  using (payer_profile_id = (select auth.uid()));

create policy "admins manage work outcomes" on public.work_outcomes
  for all to authenticated
  using ((select private.is_admin()))
  with check ((select private.is_admin()) and recorded_by = (select auth.uid()));

create policy "introduction participants read work outcomes" on public.work_outcomes
  for select to authenticated
  using (exists (
    select 1 from public.manual_introductions i
    left join public.workers w on w.id = i.worker_id
    left join public.job_postings j on j.id = i.job_posting_id
    left join public.employers e on e.id = j.employer_id
    where i.id = introduction_id
      and (w.profile_id = (select auth.uid()) or e.profile_id = (select auth.uid()))
  ));
