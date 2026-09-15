begin;

delete from public.demo_employers
where demo_code ~ '^DEMO-E-[0-9]{3}$'
  and right(demo_code, 3)::integer > 30;

insert into public.demo_workers(demo_code, display_name, city, job_category, experience_months)
select
  'DEMO-W-' || lpad(n::text, 3, '0'),
  '가상 근로자 ' || lpad(n::text, 3, '0'),
  '시연 지역 ' || (((n - 1) % 10) + 1)::text,
  (array['물류', '생산', '포장', '식품', '서비스'])[((n - 1) % 5) + 1],
  ((n - 1) % 61)
from generate_series(31, 200) as n
on conflict (demo_code) do nothing;

update public.demo_workers
set display_name = '홍길동'
where demo_code = 'DEMO-W-001';

do $$
begin
  if (select count(*) from public.demo_employers) <> 30 then
    raise exception '가상 고용주 레코드는 정확히 30건이어야 합니다.';
  end if;
  if (select count(*) from public.demo_workers) <> 200 then
    raise exception '가상 근로자 레코드는 정확히 200건이어야 합니다.';
  end if;
end;
$$;

commit;
