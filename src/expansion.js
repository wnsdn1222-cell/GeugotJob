import { comparisonRows, summarizeWorker, outcomeSummary, selectedRecord } from './expansion-data.js';

const escape = (value = '') => String(value).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const expansionNav = () => `<nav class="expansion-nav" aria-label="사업 확장 기능"><a href="#worker-information">업무정보</a><a href="#matching">AI 맞춤 매칭</a><a href="#visa">단기 비자</a><a href="#points-policy">플랫폼 포인트</a></nav>`;
const legend = () => '<p class="expansion-legend">실제 동작: 권한 내 DB 조회 · 시연용: 별도 가상 데이터 · 개발 예정: 자동화·AI · 검토 예정: 비자·포인트</p>';
const modeButtons = (area) => `<div class="expansion-modes" role="group" aria-label="${area === 'info' ? '업무정보' : '조건 비교'} 데이터 구분"><button type="button" data-expansion-mode="actual" data-area="${area}" aria-pressed="true">실제 저장 정보</button><button type="button" data-expansion-mode="demo" data-area="${area}" aria-pressed="false">시연용 가상 데이터</button></div>`;

export function workerInformationSection() {
  return `<section class="section expansion-section" id="worker-information">
    ${expansionNav()}<div class="section-heading"><div><span class="feature-state planned">자동 제공 개발 예정</span><h2>근로자 업무정보<br>제공 자동화</h2></div><p>저장된 유사업무 경험·희망조건·근무정보를 항목별로 정리합니다. 고용주에게 제공할 정보의 범위와 동의가 확정되기 전에는 실제 회원 정보를 공개하지 않습니다.</p></div>
    ${legend()}${modeButtons('info')}<div id="worker-information-content" class="expansion-content" aria-live="polite"></div>
    <div class="expansion-callout"><b>실제 고용주 열람·추천·소개는 아직 미운영</b><p>유료직업소개사업 등록 확인, 제공받는 고용주·정보 항목·이용 목적·보유기간·철회 방식에 대한 동의와 접근 권한을 확정한 후 연결합니다. 프로필 저장 동의를 고용주 제공 동의로 간주하지 않습니다.</p></div>
  </section>`;
}

export function matchingSection() {
  return `<section class="section expansion-section" id="matching">
    ${expansionNav()}<div class="section-heading"><div><span class="feature-state planned">AI 개발 예정 · 계산 미연결</span><h2>AI 맞춤 매칭<br>조건과 근거 확인</h2></div><p>실제 근무조건·통근 여건·유사업무 경험·희망조건을 나란히 확인합니다. 현재는 정보 비교 화면이며, AI 추천·순위·성실성 점수는 산출하지 않습니다.</p></div>
    ${legend()}${modeButtons('compare')}<div id="expansion-comparison-content" class="expansion-content" aria-live="polite"></div>
    <div class="expansion-callout"><b>근무 결과를 축적한 후 매칭 기준 고도화</b><p>출근 여부 → 첫 근무 완료 여부 → 계약기간 이행 결과와 고용주 의견을 기존 기록에 누적하는 계획입니다. 필요한 데이터 수, 충분성 기준, 이행률 계산식과 모델 성능 기준은 미정이며 임의의 기준을 적용하지 않습니다.</p><a class="expansion-link" href="#prototype">기존 면접·채용 흐름 시연 보기 →</a></div>
  </section>`;
}

export function visaSection() {
  return `<section class="section expansion-section" id="visa">
    ${expansionNav()}<div class="section-heading"><div><span class="feature-state review">검토 예정</span><h2>외국인 근로자<br>단기 비자 지원 — 검토 예정</h2></div><p>구체적인 지원 범위와 운영 방식은 아직 정해지지 않았습니다. 현재는 사업 확장 방향을 설명하는 안내 화면입니다.</p></div>
    <div class="expansion-review-grid"><article><h3>현재 제공하는 내용</h3><p>검토 예정 상태와 미정인 사항에 대한 안내만 제공합니다. 실제 신청 접수·상담 연결·발급 지원은 제공하지 않습니다.</p></article><article><h3>추가 검토가 필요한 사항</h3><ul><li>구체적인 지원 범위</li><li>운영 방식과 수행 주체</li><li>관련 요건 검토 및 안내 기준</li></ul></article></div>
    <div class="expansion-callout"><b>비자 종류·신청 조건·처리 기간 미정</b><p>확인되지 않은 비자 유형이나 신청 조건, 처리 기간을 표시하지 않으며 발급 가능 여부도 판단하지 않습니다. 이전의 체류자격 입력·파트너 연결 시연은 이 안내로 대체했습니다.</p></div>
    <a class="button ghost" href="#points-policy">플랫폼 포인트 검토 안내 →</a>
  </section>`;
}

export function pointsSection() {
  return `<section class="policy-document expansion-section" id="points-policy" aria-labelledby="points-title"><article>
    <a class="policy-close" href="#worker-information">사업 확장 화면으로</a>${expansionNav()}<span class="feature-state review">검토 예정</span><h2 id="points-title">현금 인출 가능한 플랫폼 포인트 — 검토 예정</h2>
    <p>사업 확장 단계에서 검토할 기능입니다. 현재 실제 적립·잔액 부여·현금 인출을 운영하지 않으며, 화면에 임의의 잔액이나 현금 가치를 표시하지 않습니다.</p>
    <div class="expansion-review-grid"><div><h3>아직 정해지지 않은 기준</h3><ul><li>포인트 적립 기준</li><li>포인트와 현금의 환산 비율</li><li>출금 조건과 운영 방식</li></ul></div><div><h3>운영 기준 확정 후 개발</h3><p>확정된 기준과 필요한 검토를 바탕으로 실제 적립·출금 기능을 개발할 예정입니다. 현재 충전·출금 버튼이나 신청서를 제공하지 않습니다.</p></div></div>
    <div class="expansion-callout"><b>현재는 안내만 제공</b><p>기존 포인트 원장·출금 요청 테이블의 존재가 실제 운영을 의미하지 않습니다. 플랫폼의 임금 보관·지급 기능은 추가하지 않습니다.</p></div>
  </article></section>`;
}

function definitionList(rows) {
  return `<dl class="information-summary">${rows.map(([key, value]) => `<div><dt>${escape(key)}</dt><dd>${escape(value)}</dd></div>`).join('')}</dl>`;
}

export function initExpansionExperience({ client, loadSnapshot, loadDemo }) {
  const info = document.querySelector('#worker-information-content');
  const comparison = document.querySelector('#expansion-comparison-content');
  const state = { info: 'actual', compare: 'actual', snapshot: null, actualStatus: 'signed-out', demo: null, demoStatus: 'idle', demoWorker: '', demoEmployer: '', job: '' };
  let authEpoch = 0;

  const actualPrompt = () => {
    if (state.actualStatus === 'loading') return '<p class="expansion-empty">권한과 DB 기록을 확인하는 중입니다…</p>';
    if (state.actualStatus === 'signed-out') return '<p class="expansion-empty">로그인 후 본인의 저장 정보를 조회할 수 있습니다. 실제 회원 정보는 로그인 전 공개하지 않습니다.</p><a class="button lime" href="#member" data-expansion-login>로그인·회원가입 화면으로</a>';
    if (state.actualStatus === 'error') return '<p class="expansion-empty error">정보를 불러오지 못했습니다. 미등록으로 처리하거나 가상 정보로 대체하지 않았습니다.</p><button class="button" type="button" data-expansion-refresh>다시 조회</button>';
    return '';
  };
  const demoPrompt = () => state.demoStatus === 'loading' ? '<p class="expansion-empty">별도 시연 DB를 조회하는 중입니다…</p>'
    : state.demoStatus === 'error' ? '<p class="expansion-empty error">시연 DB 조회 실패. 실제 회원 정보나 임의의 예시로 대체하지 않았습니다.</p><button class="button" type="button" data-expansion-demo-refresh>다시 조회</button>' : '';

  function demoWorker() { return selectedRecord(state.demo?.workers, state.demoWorker); }
  function demoEmployer() { return selectedRecord(state.demo?.employers, state.demoEmployer); }
  function demoSelector(kind) {
    const records = kind === 'worker' ? state.demo?.workers ?? [] : state.demo?.employers ?? [];
    const selected = kind === 'worker' ? demoWorker()?.id : demoEmployer()?.id;
    return `<label>${kind === 'worker' ? '가상 근로자' : '시연 음식점'}<select data-expansion-demo-select="${kind}" ${records.length ? '' : 'disabled'}>${records.length ? records.map(row => `<option value="${escape(row.id)}" ${row.id === selected ? 'selected' : ''}>${escape(row.display_name)} · ${escape(row.job_category ?? row.industry)}</option>`).join('') : '<option>시연 레코드 미등록</option>'}</select></label>`;
  }
  function renderInformation() {
    if (state.info === 'demo') {
      info.innerHTML = demoPrompt() || `<div class="expansion-card"><span class="feature-state demo">시연용 가상 데이터 · 실제 회원 아님</span><p>기존 시연 DB 일부를 조회합니다. 추천 순서나 실제 이용 실적이 아니며, 등록되지 않은 항목은 미등록으로 표시합니다.</p>${demoSelector('worker')}${definitionList(summarizeWorker(demoWorker()))}<p>출근·첫 근무·계약기간 결과: 미등록 — 가상 실적을 만들지 않았습니다.</p></div>`;
      return;
    }
    if (actualPrompt()) { info.innerHTML = actualPrompt(); return; }
    const data = state.snapshot;
    if (!data) { info.innerHTML = ''; return; }
    if (data.role !== 'worker') {
      info.innerHTML = '<div class="expansion-card"><span class="feature-state planned">고용주 제공 개발 예정</span><h3>현재 열람 가능한 근로자 업무정보 없음</h3><p>제공 동의의 수신자·항목·목적·기간·철회 기준과 사업 등록 확인이 필요합니다. 다른 회원의 업무정보를 조회하거나 공개하지 않았습니다.</p><p>위의 ‘시연용 가상 데이터’에서 고용주가 확인할 정보 구성을 체험할 수 있습니다.</p></div>';
      return;
    }
    const active = data.consents.filter(c => !c.withdrawn_at);
    const consentLabel = !active.length ? '동의 이력 미등록' : active.some(c => c.is_draft) ? '초안 동의 이력 있음 — 고용주 제공 승인 아님' : '기존 동의 이력 있음 — 별도 고용주 제공 승인 아님';
    info.innerHTML = `<div class="expansion-card"><span class="feature-state live">실제 동작 · 본인 DB 조회</span><h3>${data.worker ? '내 업무정보 요약' : '업무정보 미등록'}</h3>${definitionList(summarizeWorker(data.worker))}<p>${escape(consentLabel)}</p><p>본인 조회 전용입니다. 이 화면을 열어도 정보가 고용주에게 전달되거나 새로 저장되지 않습니다.</p>${definitionList(outcomeSummary(data.outcomes))}<button class="button" type="button" data-expansion-refresh>저장 정보 다시 조회</button></div>`;
  }
  function renderComparison() {
    const demo = state.compare === 'demo';
    const prompt = demo ? demoPrompt() : actualPrompt();
    if (prompt) { comparison.innerHTML = prompt; return; }
    const jobs = state.snapshot?.jobs ?? [];
    const job = demo ? demoEmployer() : jobs.find(j => j.id === state.job) ?? jobs[0] ?? null;
    const worker = demo ? demoWorker() : state.snapshot?.worker;
    const selectors = demo ? `${demoSelector('employer')}${demoSelector('worker')}` : `<label>${state.snapshot?.role === 'employer' ? '내 실제 공고' : '열람 가능한 실제 공고'}<select data-expansion-job ${jobs.length ? '' : 'disabled'}>${jobs.length ? jobs.map(j => `<option value="${escape(j.id)}" ${j.id === job?.id ? 'selected' : ''}>${escape(j.title)}</option>`).join('') : '<option>조회 가능한 운영 공고 미등록</option>'}</select></label>`;
    comparison.innerHTML = `<div class="expansion-card"><span class="feature-state ${demo ? 'demo' : 'live'}">${demo ? '시연용 가상 데이터 · 실제 추천 아님' : '실제 동작 · 권한 내 저장값 조회'}</span><p>${demo ? '선택한 두 가상 레코드를 비교합니다. 목록 순서는 추천 순위가 아니며, 시연 DB에 없는 근무조건은 채우지 않습니다.' : '근로자는 본인 정보와 열람 가능한 공고를 확인합니다. 고용주의 실제 근로자 열람은 아직 연결하지 않았습니다.'}</p><div class="expansion-selectors">${selectors}</div>
      <div class="comparison-table" role="table" aria-label="조건별 비교 근거"><div class="comparison-row comparison-head" role="row"><b role="columnheader">항목</b><b role="columnheader">고용주 조건</b><b role="columnheader">근로자 정보</b><b role="columnheader">확인 근거·한계</b></div>${comparisonRows(job, worker).map(row => `<div class="comparison-row" role="row">${row.map((cell, index) => `<${index ? 'span' : 'b'} role="cell">${escape(cell)}</${index ? 'span' : 'b'}>`).join('')}</div>`).join('')}</div>
      <p>AI 미연결 · 추천점수·성실성 점수·거리·순위 미산출. 위 자료는 자동 추천이나 실제 소개가 아닙니다.</p><h3>근무 결과 축적 상태</h3>${definitionList(outcomeSummary(demo ? [] : state.snapshot?.outcomes))}<p>${demo ? '시연 데이터는 실제 근무 결과에 합산하지 않습니다.' : '본인 권한으로 조회한 운영 기록만 표시합니다. 데이터가 없거나 상태가 미확인이면 미집계입니다.'}</p></div>`;
  }
  function render() {
    document.querySelectorAll('[data-expansion-mode]').forEach(b => b.setAttribute('aria-pressed', String(state[b.dataset.area] === b.dataset.expansionMode)));
    renderInformation(); renderComparison();
  }
  async function refreshActual() {
    const epoch = authEpoch;
    state.snapshot = null; state.actualStatus = 'loading'; render();
    try {
      const snapshot = await loadSnapshot();
      if (epoch !== authEpoch) return;
      state.snapshot = snapshot; state.actualStatus = 'ready';
    } catch {
      if (epoch !== authEpoch) return;
      state.actualStatus = 'error';
    }
    render();
  }
  async function refreshDemo() {
    state.demoStatus = 'loading'; render();
    try {
      const demo = await loadDemo();
      if (!demo) throw new Error('No demo connection');
      state.demo = demo; state.demoStatus = 'ready';
    } catch { state.demo = null; state.demoStatus = 'error'; }
    render();
  }
  document.addEventListener('click', event => {
    const mode = event.target.closest('[data-expansion-mode]');
    if (mode) {
      state[mode.dataset.area] = mode.dataset.expansionMode;
      if (mode.dataset.expansionMode === 'demo' && state.demoStatus === 'idle') void refreshDemo();
      else render();
    }
    if (event.target.closest('[data-expansion-refresh]')) void refreshActual();
    if (event.target.closest('[data-expansion-demo-refresh]')) void refreshDemo();
  });
  document.addEventListener('change', event => {
    const kind = event.target.dataset.expansionDemoSelect;
    if (kind) { state[kind === 'worker' ? 'demoWorker' : 'demoEmployer'] = event.target.value; render(); }
    if (event.target.matches('[data-expansion-job]')) { state.job = event.target.value; renderComparison(); }
  });
  function onSession(session) {
    authEpoch += 1;
    state.snapshot = null; state.job = ''; state.actualStatus = session ? 'loading' : 'signed-out'; render();
    if (session) void refreshActual();
  }
  render();
  if (client) {
    const initialEpoch = authEpoch;
    client.auth.getSession().then(({ data }) => { if (initialEpoch === authEpoch) onSession(data.session); });
    client.auth.onAuthStateChange((_event, session) => {
      // Clear private UI immediately; do not hold the auth callback open for API work.
      authEpoch += 1; state.snapshot = null; state.actualStatus = session ? 'loading' : 'signed-out'; render();
      const epoch = authEpoch;
      window.setTimeout(() => { if (epoch === authEpoch) onSession(session); }, 0);
    });
  }
}
