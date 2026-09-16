export const missing = value => value == null || String(value).trim() === '' ? '미등록' : String(value);
export const wageLabel = response => ({ paid: '지급받음', not_paid: '아직 지급받지 못함', partially_paid: '일부 지급 (이전 응답)', unknown: '확인 중 (이전 응답)' }[response] ?? '미응답');
export const contractLabel = value => ({ confirmed: '체결 확인', submitted: '확인자료 접수 · 체결 미확인', rejected: '확인 반려', pending: '체결 확인 대기' }[value] ?? '체결 확인 대기');
export const workEnded = outcome => ['completed', 'ended_early'].includes(outcome?.contract_outcome);
export const formatTime = value => value ? new Date(value).toLocaleString('ko-KR') : '미기록';
export function thresholdNumber(value) {
  if (value == null || String(value).trim() === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0 || n > 99999.99) throw new Error('양수 기준 거리(km)를 입력하세요.');
  return n;
}
const validLocation = point => point && Number.isFinite(point.lat) && Number.isFinite(point.lon) && Math.abs(point.lat) <= 90 && Math.abs(point.lon) <= 180;
export function straightLineAssessment(a, b, threshold) {
  const limit = thresholdNumber(threshold);
  if (limit == null) return { status: 'configuration_required', distance_km: null, is_nearby: null, message: '기준 거리 설정 필요' };
  if (!validLocation(a) || !validLocation(b)) return { status: 'coordinates_required', distance_km: null, is_nearby: null, message: '거리 확인 불가: 위치정보 없음' };
  const rad = n => n * Math.PI / 180;
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  const distance = 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, h))));
  return { status: 'calculated', distance_method: 'straight_line_haversine', distance_km: distance, nearby_threshold_km: limit, is_nearby: distance <= limit };
}
export function distanceLabel(result) {
  if (!result || result.distance_km == null) return result?.status === 'configuration_required' ? '기준 거리 설정 필요 · 거리 확인 불가' : '거리 확인 불가';
  if (result.is_nearby == null) return `직선거리 ${Number(result.distance_km).toFixed(3)}km · 기준 거리 설정 필요`;
  return `직선거리 ${Number(result.distance_km).toFixed(3)}km · 기준 ${result.nearby_threshold_km}km ${result.is_nearby ? '이내' : '밖'}`;
}
// Geometric fixtures, not anyone's residence. No demo coordinate is sent to the real location API.
export function demoLocation(id) {
  return Number(id) % 3 === 0 ? null : { lat: Number(id) % 3 === 1 ? 0.005 : 0.05, lon: 0 };
}
export function comparisonItems(job, worker, employerFeedback, assessment) {
  return [
    ['실제 근무조건', [job?.work_days, job?.work_hours, job?.wage_amount == null ? null : `${job.wage_amount}원 (${job.wage_type})`, job?.description].filter(Boolean).join(' · ') || '미등록'],
    ['통근 여건', `${missing(job?.city)} ↔ ${missing(worker?.city)} · ${distanceLabel(assessment)}`],
    ['유사업무 경험', missing(worker?.experience_summary)],
    ['희망조건', missing(worker?.desired_conditions)],
    ['고용주 의견', missing(employerFeedback)]
  ];
}
export const newDemoRun = () => ({ demo_employer_id: null, demo_worker_id: null, matching_reason: '', employer_feedback: '', contract_status: 'pending', contract_evidence: '', work_ended: false, wage_response: null, wage_responded_at: null, nearby_threshold_km: null });

export function createEmploymentApi(client, loadConsole) {
  const unwrap = ({ data, error }) => { if (error) throw error; return data; };
  async function user() {
    if (!client) throw new Error('DB 연결 설정이 필요합니다.');
    const result = await client.auth.getUser();
    if (result.error || !result.data?.user) throw new Error('로그인이 필요합니다.');
    return result.data.user;
  }
  return {
    async load() {
      const authUser = await user();
      const profile = unwrap(await client.from('profiles').select('role').eq('id', authUser.id).single());
      const [cases, readiness, demo] = await Promise.all([
        client.rpc('employment_cases'), client.rpc('workflow_readiness'),
        client.from('workflow_demo_runs').select('*').eq('owner_profile_id', authUser.id).maybeSingle()
      ]);
      const consoleData = profile.role === 'admin' ? await loadConsole() : null;
      return { userId: authUser.id, role: profile.role, cases: unwrap(cases) ?? [], readiness: unwrap(readiness), demo: unwrap(demo), consoleData };
    },
    async saveDemo(values) {
      const authUser = await user();
      const fields = Object.fromEntries(Object.keys(newDemoRun()).filter(key => key !== 'wage_responded_at').map(key => [key, values[key] ?? null]));
      unwrap(await client.from('workflow_demo_runs').upsert({ ...fields, owner_profile_id: authUser.id }, { onConflict: 'owner_profile_id' }).select('owner_profile_id').single());
      // A separate read verifies persistence rather than trusting a optimistic UI update.
      return unwrap(await client.from('workflow_demo_runs').select('*').eq('owner_profile_id', authUser.id).single());
    },
    async preview(jobId, workerId, threshold) {
      await user();
      return unwrap(await client.rpc('preview_commute', { p_job_id: jobId, p_worker_id: workerId, p_threshold: thresholdNumber(threshold) }));
    },
    async saveLocation(values) {
      await user();
      return unwrap(await client.rpc('save_commute_location', values));
    }
  };
}
