import test from 'node:test';
import assert from 'node:assert/strict';
import { loadExpansionSnapshot, summarizeWorker, comparisonRows, outcomeSummary, selectedRecord } from '../src/expansion-data.js';
import { workerInformationSection, matchingSection, visaSection, pointsSection } from '../src/expansion.js';

function mockClient(role, rows = {}, authError = null) {
  const calls = [];
  const client = {
    auth: { getUser: async () => ({ data: { user: authError ? null : { id: 'self', user_metadata: { role: 'admin' } } }, error: authError }) },
    from(table) {
      const call = { table, filters: [], columns: null };
      calls.push(call);
      const query = {
        select(columns) { call.columns = columns; return query; },
        eq(key, value) { call.filters.push([key, value]); return query; },
        single() { return query; }, maybeSingle() { return query; }, order() { return query; },
        then(resolve, reject) {
          const result = rows[table] ?? { data: table === 'profiles' ? { role } : ['workers', 'employers'].includes(table) ? null : [], error: null };
          return Promise.resolve(result).then(resolve, reject);
        }
      };
      return query;
    }
  };
  return { client, calls };
}

test('empty worker fields are missing, not synthetic defaults', () => {
  assert.ok(summarizeWorker(null).every(([, value]) => value === '미등록'));
  assert.equal(summarizeWorker({ experience_months: 0 })[1][1], '0개월');
});
test('numeric demo IDs resolve from HTML select string values', () => {
  assert.equal(selectedRecord([{ id: 1 }, { id: 2 }], '2').id, 2);
  assert.equal(selectedRecord([], '2'), null);
});
test('comparison has four evidence rows without calculated numbers', () => {
  const rows = comparisonRows(null, null);
  assert.equal(rows.length, 4);
  assert.ok(rows.every(row => row[1] === '미등록'));
  assert.doesNotMatch(JSON.stringify(rows), /\d+(점|km|명)/);
});
test('unknown results remain unaggregated; recorded negative results still count', () => {
  assert.ok(outcomeSummary([{ attendance_status: 'unknown' }]).every(([, value]) => value === '미집계'));
  const summary = outcomeSummary([{ attendance_status: 'no_show', first_shift_status: 'not_completed', contract_outcome: 'ended_early' }]);
  assert.ok(summary.every(([, value]) => value === '1건 기록'));
});
test('unauthenticated access performs no table reads', async () => {
  const { client, calls } = mockClient('worker', {}, new Error('expired'));
  await assert.rejects(loadExpansionSnapshot(client), /로그인/);
  assert.equal(calls.length, 0);
});
test('worker reads own safe columns, own consents and production jobs', async () => {
  const { client, calls } = mockClient('worker');
  const result = await loadExpansionSnapshot(client);
  assert.equal(result.role, 'worker'); // user_metadata admin is ignored.
  assert.equal(result.worker, null);
  assert.equal(result.disclosure, 'locked');
  const workerRead = calls.find(c => c.table === 'workers');
  assert.deepEqual(workerRead.filters, [['profile_id', 'self']]);
  assert.doesNotMatch(workerRead.columns, /phone|email|nationality|visa|latitude|longitude|score/);
  assert.deepEqual(calls.find(c => c.table === 'consent_records').filters, [['user_id', 'self']]);
  assert.ok(calls.find(c => c.table === 'job_postings').filters.some(([k, v]) => k === 'operating_mode' && v === 'production'));
  assert.ok(!calls.some(c => c.table === 'work_outcomes'));
});
test('worker outcomes are scoped by worker and production introduction', async () => {
  const { client, calls } = mockClient('worker', { workers: { data: { id: 'own-worker' }, error: null } });
  await loadExpansionSnapshot(client);
  assert.deepEqual(calls.find(c => c.table === 'work_outcomes').filters, [['introduction.worker_id', 'own-worker'], ['introduction.operating_mode', 'production']]);
});
test('employer cannot fetch other workers or treat an old match as consent', async () => {
  const { client, calls } = mockClient('employer', { employers: { data: { id: 'own-company' }, error: null } });
  const result = await loadExpansionSnapshot(client);
  assert.equal(result.worker, null);
  assert.equal(result.disclosure, 'locked');
  assert.ok(!calls.some(c => ['workers', 'matches', 'consent_records', 'work_outcomes'].includes(c.table)));
  assert.ok(calls.find(c => c.table === 'job_postings').filters.some(([k, v]) => k === 'employer_id' && v === 'own-company'));
});
test('failed queries throw instead of returning missing data', async () => {
  const { client } = mockClient('worker', { workers: { data: null, error: new Error('DB unavailable') } });
  await assert.rejects(loadExpansionSnapshot(client), /DB unavailable/);
});
test('unknown roles do not gain worker data access', async () => {
  const { client, calls } = mockClient('unexpected');
  await loadExpansionSnapshot(client);
  assert.deepEqual(calls.map(c => c.table), ['profiles']);
});
test('visa and points pages only explain pending review', () => {
  assert.match(visaSection(), /단기 비자 지원 — 검토 예정/);
  assert.match(pointsSection(), /현금 인출 가능한 플랫폼 포인트 — 검토 예정/);
  for (const html of [visaSection(), pointsSection()]) {
    assert.doesNotMatch(html, /<form|<input|<select|\d+[,.]?\d*(포인트|원|일|개월)|E-9|H-2/);
  }
});
test('real, demo and development states are explicit', () => {
  assert.match(workerInformationSection(), /실제 저장 정보/);
  assert.match(workerInformationSection(), /시연용 가상 데이터/);
  assert.match(matchingSection(), /AI 개발 예정 · 계산 미연결/);
});
