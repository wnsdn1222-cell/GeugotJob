create or replace function public.calculate_commute_assessment(p_introduction_id uuid)
returns public.commute_assessments
language sql
security invoker
set search_path = ''
as $$
  select * from private.calculate_commute_assessment(p_introduction_id);
$$;

revoke all on function public.calculate_commute_assessment(uuid) from public, anon;
grant execute on function public.calculate_commute_assessment(uuid) to authenticated;

