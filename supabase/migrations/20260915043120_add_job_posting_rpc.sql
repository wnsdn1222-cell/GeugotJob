create function public.create_job_posting_with_contact(
  p_title text,
  p_job_category text,
  p_city text,
  p_company_name text,
  p_workplace_address text,
  p_employment_type text,
  p_work_days text,
  p_work_hours text,
  p_wage_type text,
  p_wage_amount integer,
  p_wage_notes text,
  p_headcount integer,
  p_starts_on date,
  p_ends_on date,
  p_description text,
  p_contact_name text,
  p_contact_email text,
  p_contact_phone text,
  p_preferred_channel text,
  p_consent_record_id uuid,
  p_operating_mode text default 'development'
)
returns uuid
language plpgsql
security invoker
set search_path = ''
as $$
declare
  owned_employer_id uuid;
  created_job_id uuid;
begin
  select e.id into owned_employer_id
  from public.employers e
  where e.profile_id = (select auth.uid());

  if owned_employer_id is null then
    raise exception '고용주 정보를 먼저 저장해 주세요.';
  end if;

  if not exists (
    select 1
    from public.consent_records c
    where c.id = p_consent_record_id
      and c.user_id = (select auth.uid())
      and c.consent_type = 'employer_contact_disclosure'
      and c.withdrawn_at is null
  ) then
    raise exception '유효한 연락처 공개 동의가 필요합니다.';
  end if;

  insert into public.job_postings (
    employer_id, title, job_category, city, company_name, workplace_address,
    employment_type, work_days, work_hours, wage_type, wage_amount, hourly_wage,
    wage_notes, headcount, starts_on, ends_on, description, is_active,
    publication_status, actual_conditions_confirmed, operating_mode, published_at
  ) values (
    owned_employer_id, trim(p_title), trim(p_job_category), trim(p_city), trim(p_company_name),
    trim(p_workplace_address), trim(p_employment_type), trim(p_work_days), trim(p_work_hours),
    p_wage_type, p_wage_amount,
    case when p_wage_type = 'hourly' then p_wage_amount else null end,
    nullif(trim(p_wage_notes), ''), p_headcount, p_starts_on, p_ends_on,
    nullif(trim(p_description), ''), true, 'published', true, p_operating_mode, now()
  ) returning id into created_job_id;

  insert into public.job_contacts (
    job_posting_id, employer_id, contact_name, contact_email, contact_phone,
    preferred_channel, consent_record_id
  ) values (
    created_job_id, owned_employer_id, trim(p_contact_name),
    nullif(trim(p_contact_email), ''), nullif(trim(p_contact_phone), ''),
    p_preferred_channel, p_consent_record_id
  );

  return created_job_id;
end;
$$;

revoke all on function public.create_job_posting_with_contact(
  text, text, text, text, text, text, text, text, text, integer, text, integer,
  date, date, text, text, text, text, text, uuid, text
) from public, anon;
grant execute on function public.create_job_posting_with_contact(
  text, text, text, text, text, text, text, text, text, integer, text, integer,
  date, date, text, text, text, text, text, uuid, text
) to authenticated;
