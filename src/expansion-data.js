// Read-only expansion data. No consent, registration, score or payment is invented here.
export const workerInformationColumns = 'id, job_category, city, experience_months, availability_date, experience_summary, desired_conditions';
const jobColumns = 'id, title, job_category, city, work_days, work_hours, wage_type, wage_amount, wage_notes, description, operating_mode';

function unwrap(result) {
  if (result.error) throw result.error;
  return result.data;
}

export async function loadExpansionSnapshot(client) {
  if (!client) throw new Error('DB 연결 설정을 확인해야 합니다.');
  const auth = await client.auth.getUser();
  if (auth.error || !auth.data?.user) throw new Error('로그인이 필요합니다.');
  const userId = auth.data.user.id;
  const profile = unwrap(await client.from('profiles').select('role').eq('id', userId).single());
  // Role is read from the protected profile, never from user-editable metadata.
  const snapshot = { role: profile.role, worker: null, jobs: [], outcomes: [], consents: [], disclosure: 'locked' };
  if (profile.role === 'worker') {
    const [worker, consents, jobs] = await Promise.all([
      client.from('workers').select(workerInformationColumns).eq('profile_id', userId).maybeSingle(),
      client.from('consent_records').select('consent_type, document_version, is_draft, operating_mode, withdrawn_at').eq('user_id', userId),
      client.from('job_postings').select(jobColumns).eq('operating_mode', 'production').eq('publication_status', 'published').eq('is_active', true).order('created_at', { ascending: false })
    ]);
    snapshot.worker = unwrap(worker);
    snapshot.consents = unwrap(consents) ?? [];
    snapshot.jobs = unwrap(jobs) ?? [];
    if (snapshot.worker) {
      snapshot.outcomes = unwrap(await client.from('work_outcomes')
        .select('attendance_status, first_shift_status, contract_outcome, recorded_at, introduction:manual_introductions!inner(worker_id, operating_mode)')
        .eq('introduction.worker_id', snapshot.worker.id).eq('introduction.operating_mode', 'production')) ?? [];
    }
  } else if (profile.role === 'employer') {
    const company = unwrap(await client.from('employers').select('id').eq('profile_id', userId).maybeSingle());
    if (company) snapshot.jobs = unwrap(await client.from('job_postings').select(jobColumns)
      .eq('employer_id', company.id).eq('operating_mode', 'production').order('created_at', { ascending: false })) ?? [];
    // Do not query other workers: approved recipient/scope consent and launch approval
    // are not defined. Existing match visibility is NOT treated as disclosure consent.
  }
  return snapshot;
}

export const valueOrMissing = (value) => value == null || String(value).trim() === '' ? '미등록' : String(value);
export const experienceText = (months) => months == null ? '미등록' : `${months}개월`;
export const selectedRecord = (records = [], id = '') => records.find(row => String(row.id) === String(id)) ?? records[0] ?? null;

export function summarizeWorker(worker) {
  return [
    ['유사업무 경험', valueOrMissing(worker?.experience_summary)],
    ['등록 경력', experienceText(worker?.experience_months)],
    ['희망 직종', valueOrMissing(worker?.job_category)],
    ['희망조건', valueOrMissing(worker?.desired_conditions)],
    ['등록 지역', valueOrMissing(worker?.city)],
    ['근무 가능일', valueOrMissing(worker?.availability_date)]
  ];
}

export function comparisonRows(job, worker) {
  return [
    ['실제 근무조건', [job?.work_days, job?.work_hours].filter(Boolean).join(' · ') || '미등록', valueOrMissing(worker?.availability_date), '근무일·시간과 근무 가능일을 직접 확인합니다.'],
    ['통근 여건', valueOrMissing(job?.city), valueOrMissing(worker?.city), '지역 정보만 표시합니다. 거리 계산 방식·근거리 기준·이동수단은 추가 확인이 필요합니다.'],
    ['유사업무 경험', valueOrMissing(job?.job_category ?? job?.industry), valueOrMissing(worker?.experience_summary) + ' / 경력 ' + experienceText(worker?.experience_months), '등록 직종·업무 내용과 경험을 확인합니다. 유사도 점수는 계산하지 않습니다.'],
    ['희망조건', valueOrMissing(job?.description), valueOrMissing(worker?.desired_conditions), '업무 내용과 희망조건을 나란히 표시합니다. 적합 여부는 자동 판정하지 않습니다.']
  ];
}

export function outcomeSummary(outcomes = []) {
  const known = (key) => outcomes.filter(row => row[key] && row[key] !== 'unknown').length;
  const label = (count) => count ? `${count}건 기록` : '미집계';
  return [
    ['출근 여부', label(known('attendance_status'))],
    ['첫 근무 완료 여부', label(known('first_shift_status'))],
    ['계약기간 이행 결과', label(known('contract_outcome'))]
  ];
}
