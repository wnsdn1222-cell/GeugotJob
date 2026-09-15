begin;

with restaurant_names(demo_code, display_name, city, industry) as (
  values
    ('DEMO-E-001', '해솔식당', '서울 강남구', '한식'),
    ('DEMO-E-002', '온기밥상', '서울 마포구', '한식'),
    ('DEMO-E-003', '달빛포차', '인천 남동구', '주점'),
    ('DEMO-E-004', '소담국수', '경기 안산시', '국수'),
    ('DEMO-E-005', '모락정원', '경기 수원시', '한식'),
    ('DEMO-E-006', '봄날분식', '경기 화성시', '분식'),
    ('DEMO-E-007', '바른한상', '경기 평택시', '한식'),
    ('DEMO-E-008', '고운식탁', '충남 천안시', '한식'),
    ('DEMO-E-009', '새벽카페', '대전 서구', '카페'),
    ('DEMO-E-010', '구름베이커리', '부산 사하구', '베이커리'),
    ('DEMO-E-011', '담소반', '서울 강남구', '한식'),
    ('DEMO-E-012', '하루덮밥', '서울 마포구', '일식'),
    ('DEMO-E-013', '초록마루', '인천 남동구', '한식'),
    ('DEMO-E-014', '별밤치킨', '경기 안산시', '치킨'),
    ('DEMO-E-015', '노을키친', '경기 수원시', '양식'),
    ('DEMO-E-016', '마실국밥', '경기 화성시', '국밥'),
    ('DEMO-E-017', '은하수면관', '경기 평택시', '중식'),
    ('DEMO-E-018', '다온찻집', '충남 천안시', '카페'),
    ('DEMO-E-019', '솔바람구이', '대전 서구', '구이'),
    ('DEMO-E-020', '행복찬방', '부산 사하구', '반찬'),
    ('DEMO-E-021', '아침뜰', '서울 강남구', '브런치'),
    ('DEMO-E-022', '맛나골목', '서울 마포구', '분식'),
    ('DEMO-E-023', '포근한끼', '인천 남동구', '도시락'),
    ('DEMO-E-024', '한결식당', '경기 안산시', '한식'),
    ('DEMO-E-025', '두레밥상', '경기 수원시', '한식'),
    ('DEMO-E-026', '오솔길카페', '경기 화성시', '카페'),
    ('DEMO-E-027', '산들분식', '경기 평택시', '분식'),
    ('DEMO-E-028', '윤슬주방', '충남 천안시', '한식'),
    ('DEMO-E-029', '반달베이커리', '대전 서구', '베이커리'),
    ('DEMO-E-030', '들꽃한상', '부산 사하구', '한식')
)
update public.demo_employers as employer
set
  display_name = restaurant.display_name,
  city = restaurant.city,
  industry = restaurant.industry
from restaurant_names as restaurant
where employer.demo_code = restaurant.demo_code;

with worker_names as (
  select
    'DEMO-W-' || lpad(n::text, 3, '0') as demo_code,
    case
      when n = 1 then '홍길동'
      else
        (array['김', '이', '박', '최', '정', '강', '조', '윤', '장', '임', '한', '오', '서', '신', '권', '황', '안', '송', '류', '홍'])[((n - 1) / 10) + 1]
        || (array['민준', '서준', '도윤', '예준', '시우', '하준', '주원', '지호', '현우', '준서'])[((n - 1) % 10) + 1]
    end as display_name,
    (array['서울 강남구', '서울 마포구', '인천 남동구', '경기 안산시', '경기 수원시', '경기 화성시', '경기 평택시', '충남 천안시', '대전 서구', '부산 사하구'])[((n - 1) % 10) + 1] as city,
    (array['홀서빙', '주방보조', '설거지', '음식 포장', '매장 관리'])[((n - 1) % 5) + 1] as job_category
  from generate_series(1, 200) as n
)
update public.demo_workers as worker
set
  display_name = generated.display_name,
  city = generated.city,
  job_category = generated.job_category
from worker_names as generated
where worker.demo_code = generated.demo_code;

do $$
begin
  if (select count(distinct display_name) from public.demo_employers) <> 30 then
    raise exception '시연 음식점 이름은 30개 모두 달라야 합니다.';
  end if;
  if (select count(distinct display_name) from public.demo_workers) <> 200 then
    raise exception '시연 근로자 이름은 200개 모두 달라야 합니다.';
  end if;
  if exists (
    select 1 from public.demo_employers where display_name like '가상 사업장%'
  ) or exists (
    select 1 from public.demo_workers where display_name like '가상 근로자%'
  ) then
    raise exception '자리표시자 이름이 남아 있습니다.';
  end if;
end;
$$;

commit;
