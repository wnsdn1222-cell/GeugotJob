export const workers = [
  {
    id: 'worker-001', name: '김민준', initials: '김', nationality: '대한민국', role: '물류 · 피킹',
    location: '경기 안산시', distance: 2.8, commute: 14, experience: '3년 2개월', availability: '즉시 출근',
    score: 94, fit: '적합', reliability: 96, communication: 91, skill: 93, color: 'lime',
    languages: ['한국어'], tags: ['주간', '지게차', '장기근무'], completed: 128, attendance: 98.4,
    summary: '동일 직무 경험이 풍부하고 최근 6개월 결근 이력이 없습니다. 대중교통 기준 출근이 안정적입니다.'
  },
  {
    id: 'worker-002', name: 'NGUYEN AN', initials: 'NA', nationality: '베트남', role: '생산 · 포장',
    location: '경기 시흥시', distance: 5.1, commute: 24, experience: '2년 8개월', availability: '9월 16일',
    score: 89, fit: '적합', reliability: 92, communication: 82, skill: 91, color: 'blue',
    languages: ['베트남어', '한국어 TOPIK 3'], tags: ['교대', 'E-9', '기숙사 선호'], completed: 96, attendance: 97.1,
    summary: '포장 라인 숙련도가 높고 교대 근무 경험이 있습니다. 작업 지시 이해도는 양호합니다.'
  },
  {
    id: 'worker-003', name: '박서연', initials: '박', nationality: '대한민국', role: '서비스 · 홀',
    location: '서울 금천구', distance: 7.4, commute: 36, experience: '1년 6개월', availability: '즉시 출근',
    score: 84, fit: '검토', reliability: 88, communication: 95, skill: 81, color: 'coral',
    languages: ['한국어', '영어'], tags: ['주말', '고객응대', '단기'], completed: 62, attendance: 96.2,
    summary: '의사소통과 고객 응대 평가가 우수합니다. 출퇴근 시간이 다소 길어 근무 시간 확인이 필요합니다.'
  },
  {
    id: 'worker-004', name: 'BAT-ERDENE', initials: 'BE', nationality: '몽골', role: '건설 · 보조',
    location: '경기 수원시', distance: 11.2, commute: 48, experience: '4년 1개월', availability: '9월 20일',
    score: 72, fit: '조건부', reliability: 81, communication: 68, skill: 89, color: 'amber',
    languages: ['몽골어', '한국어 기초'], tags: ['H-2', '안전교육', '숙소 필요'], completed: 151, attendance: 94.8,
    summary: '업무 숙련도는 높지만 이동 거리와 의사소통 보완이 필요합니다. 통역 지원 시 검토 가능합니다.'
  }
];

export const notifications = [
  { title: '새 추천 인재 3명', body: '안산 물류센터 공고에 새로운 후보가 추천됐어요.', time: '10분 전' },
  { title: '면접 일정 확인', body: '김민준 님이 내일 14:00 면접을 확인했어요.', time: '1시간 전' },
  { title: '서류 검토 완료', body: 'NGUYEN AN 님의 체류 자격 확인이 완료됐어요.', time: '어제' }
];

export const ledger = [
  { label: '첫 근무 확정 리워드', date: '2026. 09. 12', amount: 5000, type: 'plus' },
  { label: '출근 인증 보너스', date: '2026. 09. 09', amount: 3000, type: 'plus' },
  { label: '프로필 완성 리워드', date: '2026. 09. 01', amount: 4000, type: 'plus' }
];
