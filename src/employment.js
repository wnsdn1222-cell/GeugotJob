import { comparisonItems, contractLabel, demoLocation, demoRoute, distanceLabel, formatTime, newDemoRun, straightLineAssessment, thresholdNumber, wageLabel, workEnded } from './employment-data.js';

const esc = (value = '') => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
const options = (rows, chosen, label) => rows.map(r => `<option value="${esc(r.id)}" ${String(r.id) === String(chosen) ? 'selected' : ''}>${esc(label(r))}</option>`).join('');
const rowsHtml = rows => `<dl class="employment-comparison">${rows.map(([k,v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
export function employmentSection() {
  return `<section id="work-management" class="section expansion-section"><nav class="expansion-nav" aria-label="근무 관리 이동"><a href="#member" data-expansion-login>로그인·회원 관리</a><a href="#prototype">기존 면접 흐름 시연</a><a href="#worker-information">업무정보</a></nav>
    <div class="section-heading"><div><span class="feature-state planned">실제 기록과 시연 분리</span><h2>수동 매칭부터<br>계약·급여 확인까지</h2></div><p>계약은 검증된 체결 근거로만 확인합니다. 급여 기록은 근로자의 응답이며, 미지급 확정이나 자동 차단을 의미하지 않습니다.</p></div>
    <div class="expansion-modes"><button type="button" data-employment-mode="actual" aria-pressed="true">내 실제 근무 건</button><button type="button" data-employment-mode="demo" aria-pressed="false">시연용 예시 체험</button></div>
    <p id="employment-notice" role="status" class="employment-notice"></p><div id="employment-content" aria-live="polite"></div>
    <div class="expansion-card employment-local-distance"><span class="feature-state live">실제 동작 · 자동 위치 가져오기</span><h3>좌표 입력 없이 직선거리 확인</h3><p>로그인한 고용주와 근로자가 각자의 기기에서 위치 제공에 동의하고 ‘현재 위치 자동 저장’을 누르면, 브라우저가 좌표를 가져와 서버에 저장합니다. 두 위치가 저장되면 직선거리가 자동 계산됩니다. 정확한 좌표는 상대방에게 보이지 않습니다.</p><p>카카오 모빌리티는 임시 선택 상태입니다. API 키·이용 권한을 연결하기 전에는 실제 지도 이동거리·통근시간을 계산하지 않으며, 현재는 직선거리만 표시합니다.</p><a class="button lime" href="#member" data-expansion-login data-login-target="#work-management">로그인 후 자동 위치 저장</a></div>
  </section>`;
}

export function initEmploymentUI({ client, api, loadDemo, createManual, saveContract, saveWage, assessCommute }) {
  const root = document.querySelector('#employment-content');
  const notice = document.querySelector('#employment-notice');
  let mode = 'actual', snapshot = null, loading = false, loadError = false, demoData = null;
  let demo = newDemoRun(), authEpoch = 0, ready = false;
  let selectedJob = '', selectedWorker = '', threshold = '', feedback = '', reason = '', notes = '', assessment = null;
  let previewEpoch = 0;
  const report = text => { notice.textContent = text; };
  const currentPosition = () => new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('이 기기 또는 브라우저는 위치 자동 가져오기를 지원하지 않습니다.'));
    navigator.geolocation.getCurrentPosition(
      position => resolve({ lat: position.coords.latitude, lon: position.coords.longitude }),
      error => reject(new Error({ 1:'위치 권한이 허용되지 않았습니다.', 2:'현재 위치를 확인할 수 없습니다.', 3:'위치 확인 시간이 초과되었습니다.' }[error.code] || '현재 위치를 확인할 수 없습니다.')),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  });
  const demoWorker = () => demoData?.workers.find(w => String(w.id) === String(demo.demo_worker_id));
  const demoEmployer = () => demoData?.employers.find(e => String(e.id) === String(demo.demo_employer_id));
  function actualHTML() {
    if (loading) return '<p class="expansion-empty">DB와 접근 권한을 확인하고 있습니다…</p>';
    if (loadError) return '<p class="expansion-empty error">DB 조회 실패. 미등록으로 바꾸거나 시연 기록을 대신 표시하지 않았습니다.</p><button class="button" data-employment-reload>다시 조회</button>';
    if (!snapshot) return '<p class="expansion-empty">로그인 후 본인 또는 권한이 있는 채용·근무 건을 조회할 수 있습니다.</p><a class="button lime" href="#member" data-expansion-login>로그인·회원가입</a>';
    return `<div class="expansion-callout"><b>전자계약 자동 확인: ${snapshot.readiness.contract_connected ? '설정 있음 · 개별 근거 검증 필요' : '연동 준비 중'}</b><p>단순 클릭·자료 접수·수동 매칭 등록은 계약 체결 확인이 아닙니다. 검증 전에는 기존 소개수수료 결제도 차단합니다. 새로운 결제상품은 추가하지 않았습니다.</p></div>
      <button class="button ghost" data-employment-reload>DB 기록 다시 조회</button>
      ${snapshot.role === 'admin' ? manualHTML() : ''}
      <div class="employment-cases">${snapshot.cases.length ? snapshot.cases.map(caseHTML).join('') : '<p class="expansion-empty">조회 가능한 채용·근무 건이 없습니다. 실제 기록 미등록.</p>'}</div>${locationHTML()}`;
  }
  function caseHTML(item) {
    const c = item.contract, wage = item.wage;
    const canAnswer = snapshot.role === 'worker' && item.worker_profile_id === snapshot.userId;
    return `<article class="expansion-card employment-case"><span class="feature-state ${item.operating_mode === 'development' ? 'demo' : 'live'}">${item.operating_mode === 'development' ? '시연용 예시 · 개발 DB' : '실제 동작 · 권한 내 DB 조회'}</span><h3>${esc(item.company_name)} · ${esc(item.job_title)} ↔ ${esc(item.worker_name)}</h3><p>수동 선택 상태: ${esc(item.status)} · 채용·계약 자동 확정 아님</p>${rowsHtml([['수동 매칭 근거',item.selection_reason],['비교 메모',item.comparison_notes],['고용주 의견',item.employer_feedback || '미등록']])}
      <div class="employment-grid"><div><h4>전자근로계약 체결 확인</h4><b>${esc(contractLabel(c?.status))}</b><p>확인 근거: ${esc(c?.confirmation_method || '미등록')}<br>증빙 참조: ${esc(c?.evidence_reference || '미등록')}<br>체결 시점: ${esc(formatTime(c?.confirmed_at))}<br>검증 시점: ${esc(formatTime(c?.checked_at))}</p><button type="button" class="button" data-check-contract="${item.id}">전자계약 체결 완료 확인</button><p>${c?.status === 'confirmed' && c?.verification_source === 'provider_verified' ? '검증된 근거 기록 있음 · 결제에는 기존 별도 조건 적용' : '체결 미확인 · 결제 차단'}</p>
      ${snapshot.role === 'admin' && c?.status !== 'confirmed' ? `<form data-contract-form="${item.id}"><label>자료 검토 상태<select name="status"><option value="pending">확인 대기</option><option value="submitted" ${c?.status === 'submitted' ? 'selected' : ''}>확인자료 접수</option><option value="rejected" ${c?.status === 'rejected' ? 'selected' : ''}>확인 반려</option></select></label><label>자료 확인 메모<input name="method" maxlength="500" value="${esc(c?.confirmation_method)}"></label><label>증빙 참조<input name="evidence" maxlength="1000" value="${esc(c?.evidence_reference)}" placeholder="민감한 계약 전문을 입력하지 마세요"></label><button class="button" type="submit">자료 검토 상태 저장</button></form>` : ''}
      <details><summary>상태 기록 이력</summary>${item.contract_events.map(e=>`<p>${esc(contractLabel(e.status))} · ${esc(formatTime(e.recorded_at))}</p>`).join('') || '<p>미등록</p>'}</details></div>
      <div><h4>근로자가 응답한 지급 여부</h4><b>${esc(wageLabel(wage?.response))}</b><p>응답 시점: ${esc(formatTime(wage?.responded_at))}<br>${esc(wage?.response_note || '')}</p>
      ${canAnswer ? `<form data-wage-form="${item.id}" data-worker-id="${item.worker_id}"><label>근무 종료 후 응답<select name="response" required ${workEnded(item.outcome) ? '' : 'disabled'}><option value="">선택하세요</option><option value="paid" ${wage?.response === 'paid' ? 'selected' : ''}>지급받음</option><option value="not_paid" ${wage?.response === 'not_paid' ? 'selected' : ''}>아직 지급받지 못함</option></select></label><label>응답 메모<textarea name="note" maxlength="2000" rows="2">${esc(wage?.response_note)}</textarea></label><button class="button" type="submit" ${workEnded(item.outcome) ? '' : 'disabled'}>응답 저장</button><small>${workEnded(item.outcome) ? '응답만 기록합니다. 고용주를 자동 차단하지 않습니다.' : '근무 종료 결과가 기록된 후 응답할 수 있습니다.'}</small></form>` : ''}
      <details><summary>급여 응답 이력</summary>${item.wage_events.map(e=>`<p>${esc(wageLabel(e.response))} · ${esc(formatTime(e.responded_at))}</p>`).join('') || '<p>미응답</p>'}</details></div></div>
      <div class="employment-distance"><h4>동의된 위치의 자동 직선거리</h4><p>${esc(distanceLabel(item.commute))} · 실제 이동거리·통근시간 아님</p>${snapshot.role === 'admin' ? `<form data-assessment-form="${item.id}"><label>판별 기준 거리 (km)<input name="threshold" type="number" min="0.001" step="any" value="${esc(item.commute?.nearby_threshold_km)}" required placeholder="고정 기준 없음"></label><button class="button" type="submit">거리 판별·저장</button></form>` : ''}${item.own_location ? `<p>내 위치 자동 저장 확인 · 동의: ${esc(formatTime(item.own_location.consented_at))}<br>삭제 예정: ${esc(formatTime(item.own_location.expires_at))}</p>` : '<p>내 위치 미등록 또는 동의 철회·기간 만료</p>'}<p>지도 이동거리·통근시간: 지도 API 연결 준비 중</p></div>
      <a class="employment-link" href="#member">기존 회원·면접·일정 관리로 →</a></article>`;
  }
  function eligibleData() {
    const data = snapshot?.consoleData;
    const active = new Set(data?.participants.filter(p=>p.active).map(p=>p.profile_id));
    const production = snapshot?.readiness.introduction_enabled;
    return { jobs: data?.jobs.filter(j => active.has((Array.isArray(j.employer) ? j.employer[0] : j.employer)?.profile_id) && (production || j.is_test_data)) ?? [], workers: data?.workers.filter(w=>active.has(w.profile_id) && (production || w.is_test_data)) ?? [] };
  }
  function manualHTML() {
    const { jobs, workers } = eligibleData();
    const job = jobs.find(j=>j.id === selectedJob), worker = workers.find(w=>w.id === selectedWorker);
    return `<form id="employment-manual-form" class="expansion-card employment-manual"><span class="feature-state planned">운영자 수동 비교 · AI 추천 아님</span><h3>공고와 근로자를 직접 선택하세요</h3><p>${snapshot.readiness.introduction_enabled ? '확인된 운영 범위에서 수동으로 기록합니다.' : '사업 등록 미확인: 명시된 테스트 데이터만 선택할 수 있습니다. 실제 소개는 잠겨 있습니다.'}</p><div class="employment-grid"><label>채용 건<select name="job" required><option value="">공고 선택</option>${options(jobs,selectedJob,j=>`${j.company_name || ''} · ${j.title}`)}</select></label><label>근로자<select name="worker" required><option value="">근로자 선택</option>${options(workers,selectedWorker,w=>`${(Array.isArray(w.profile) ? w.profile[0] : w.profile)?.full_name || w.id} · ${w.job_category}`)}</select></label></div><label>기준 거리 (km, 고정 기준 없음)<input name="threshold" type="number" min="0.001" step="any" value="${esc(threshold)}" placeholder="운영자가 입력하거나 기존 설정 사용"></label><button type="button" class="button" data-preview-distance ${job && worker ? '' : 'disabled'}>동의된 위치로 직선거리 확인</button><div id="employment-comparison">${rowsHtml(comparisonItems(job,worker,feedback,assessment))}</div><label>고용주 의견<textarea name="feedback" maxlength="2000">${esc(feedback)}</textarea></label><label>비교 메모<textarea name="notes" maxlength="3000" required>${esc(notes)}</textarea></label><label>선택 근거<textarea name="reason" maxlength="2000" required>${esc(reason)}</textarea></label><button type="submit" class="button lime" ${job && worker ? '' : 'disabled'}>수동 선택과 근거 저장</button><p>등록만으로 채용·계약·결제 상태를 변경하지 않습니다. 좌표와 정확한 거주지는 이 화면에 노출하지 않습니다.</p></form>`;
  }
  function locationHTML() {
    const r = snapshot.readiness;
    if (!r.location_ready || !r.personal_location_ready) return '<div class="expansion-callout"><b>위치정보 서버 설정 확인 필요</b><p>동의 문안과 보유기간 설정을 확인하기 전에는 저장 완료로 표시하지 않습니다.</p></div>';
    const personal = snapshot.personalLocation;
    const personalForm = `<form id="employment-personal-location-form" class="expansion-card"><h3>로그인 후 내 위치 자동 저장</h3><p>${esc(r.personal_location_consent_text)}</p><p>보유기간: ${esc(r.location_retention_days)}일 · 문안 버전: ${esc(r.personal_location_consent_version)}</p><label class="employment-checkbox"><input name="consent" type="checkbox">위 기본 위치정보 제공 동의문을 읽고 동의합니다.</label><button class="button lime" name="action" value="save">동의하고 현재 위치 자동 저장</button><button class="button" name="action" value="withdraw">내 기본 위치 삭제</button><p>${personal?.saved ? `저장 확인: ${esc(formatTime(personal.consented_at))} · 삭제 예정: ${esc(formatTime(personal.expires_at))}` : '아직 저장된 내 기본 위치가 없습니다.'}<br>정확한 좌표는 다른 회원에게 공개되지 않으며, 채용 건별 거리 공유에는 별도 동의가 필요합니다.</p></form>`;
    const cases = snapshot.cases.filter(i => snapshot.role === 'worker' ? i.worker_profile_id === snapshot.userId : i.employer_profile_id === snapshot.userId);
    if (!cases.length) return `${personalForm}<div class="expansion-callout"><b>채용 건별 거리 공유는 별도 동의</b><p>현재는 조회 가능한 채용·근무 건이 없어 직선거리를 계산하거나 다른 회원에게 거리 결과를 제공하지 않습니다. 연결된 채용 건이 생긴 뒤 별도 동의를 받습니다.</p></div>`;
    return `${personalForm}<form id="employment-location-form" class="expansion-card"><h3>동의한 근무 건의 현재 위치 자동 저장</h3><p>${esc(r.location_consent_text)}</p><p>보유기간: ${esc(r.location_retention_days)}일 · 문안 버전: ${esc(r.location_consent_version)}</p><label>근무 건<select name="case" required>${options(cases,'',i=>i.job_title)}</select></label><label class="employment-checkbox"><input name="consent" type="checkbox">위 위치정보 제공 동의문을 읽고 동의합니다.</label><button class="button lime" name="action" value="save">동의하고 현재 위치 자동 저장</button><button class="button" name="action" value="withdraw">이 근무 건의 위치 제공 철회</button><p>버튼을 누르면 이 기기에서 위치 권한을 요청합니다. 좌표는 직접 입력하지 않으며, 해당 근무 건의 거리 계산에만 저장·사용됩니다.</p></form>`;
  }
  function demoHTML() {
    if (!demoData) return '<p class="expansion-empty">별도 시연 DB 목록을 불러오는 중입니다.</p>';
    const a = demoEmployer(), b = demoWorker();
    const distance = straightLineAssessment(a ? { lat:0,lon:0 } : null,b ? demoLocation(b.id) : null,demo.nearby_threshold_km);
    const route = demoRoute(a,b);
    return `<div class="expansion-callout"><b>시연용 예시 · 실제 회원·계약·급여·거리 아님</b><p>별도 가상 인물로 운영자·근로자 화면을 체험합니다. 로그인하면 본인의 별도 시연 DB에 저장할 수 있습니다. 실제 이용 실적에는 합산하지 않습니다. 로그아웃 상태의 변경은 화면 체험이며 저장되지 않습니다.</p></div>
      <form id="employment-demo-form" class="expansion-card"><span class="feature-state demo">시연용 예시</span><h3>운영자 수동 비교 체험</h3><div class="employment-grid"><label>시연 고용주<select name="employer"><option value="">선택하세요</option>${options(demoData.employers,demo.demo_employer_id,r=>r.display_name)}</select></label><label>시연 근로자<select name="worker"><option value="">선택하세요</option>${options(demoData.workers,demo.demo_worker_id,r=>r.display_name)}</select></label></div>
      <div class="employment-distance"><span class="feature-state demo">시연용 예시 · API 미호출</span><h3>카카오 모빌리티 경로 시연</h3>${route ? `<p>가상 이동거리 <b>${route.distance_km}km</b> · 가상 소요시간 <b>${route.duration_minutes}분</b></p>` : '<p>시연 고용주와 근로자를 선택하면 가상 경로 예시를 표시합니다.</p>'}<p>이 값은 선택한 시연용 가상 인물에만 적용한 임의 예시입니다. 카카오 모빌리티 API·실제 위치·실제 도로 경로를 사용하지 않았고, 실제 회원 기록이나 통근 판단에 저장되지 않습니다.</p></div>
      <label>판별할 기준 거리 (km)<input name="threshold" type="number" min="0.001" step="any" value="${esc(demo.nearby_threshold_km)}" placeholder="고정 기준 없음 · 직접 입력"></label><p>시연용 거리 계산: 사업장 (0, 0), 근로자 (${b && demoLocation(b.id) ? `${demoLocation(b.id).lat}, 0` : '좌표 없음'})의 검증용 임의 좌표입니다. 실제 거주지·통근 경로가 아닙니다.</p><button class="button" type="button" data-demo-compare>선택 조건 비교</button><div id="demo-employment-comparison">${rowsHtml(comparisonItems(a,b,demo.employer_feedback,distance))}</div>
      <label>고용주 의견 (시연)<textarea name="feedback" maxlength="2000">${esc(demo.employer_feedback)}</textarea></label><label>운영자 선택 근거 (시연)<textarea name="reason" maxlength="2000">${esc(demo.matching_reason)}</textarea></label>
      <div class="employment-grid"><div><h3>계약 상태 시연</h3><b>${esc(contractLabel(demo.contract_status))}</b><p>외부 연동 준비 중 · 확인 버튼을 눌러도 검증 근거 없이 완료되지 않습니다. 확인자료 접수는 체결 확인이 아닙니다.</p><button type="button" class="button" data-demo-check-contract>전자계약 체결 완료 확인</button><label>자료 상태<select name="contract_status"><option value="pending">확인 대기</option><option value="submitted" ${demo.contract_status==='submitted'?'selected':''}>시연 자료 접수</option></select></label><label>증빙 참조 (시연)<input name="evidence" maxlength="1000" value="${esc(demo.contract_evidence)}" placeholder="실제 계약 개인정보를 넣지 마세요"></label><p>계약 체결 미확인 · 결제 차단</p></div>
      <div><h3>급여 응답 체험</h3><label class="employment-checkbox"><input name="ended" type="checkbox" ${demo.work_ended ? 'checked' : ''}>시연 근무 건의 근무 종료 상태</label><label>근로자가 응답한 지급 여부<select name="wage" ${demo.work_ended?'':'disabled'}><option value="">미응답</option><option value="paid" ${demo.wage_response==='paid'?'selected':''}>지급받음</option><option value="not_paid" ${demo.wage_response==='not_paid'?'selected':''}>아직 지급받지 못함</option></select></label><p>응답: ${esc(wageLabel(demo.wage_response))}<br>DB 응답 시점: ${esc(formatTime(demo.wage_responded_at))}</p><p>응답으로 미지급을 확정하거나 고용주를 자동 차단하지 않습니다.</p></div></div>
      <button type="submit" class="button lime" ${snapshot?'':'disabled'}>별도 시연 DB에 저장·재조회</button><button type="button" class="button" data-employment-reload ${snapshot?'':'disabled'}>DB에서 다시 불러오기</button><p>${snapshot?'DB 저장 버튼을 눌러야 기록됩니다.':'로그인해야 DB 저장이 가능합니다.'} ${demo.updated_at?`마지막 DB 저장: ${esc(formatTime(demo.updated_at))}`:''}</p></form>`;
  }
  function render() {
    document.querySelectorAll('[data-employment-mode]').forEach(b=>b.setAttribute('aria-pressed',String(mode===b.dataset.employmentMode)));
    root.innerHTML = mode === 'demo' ? demoHTML() : actualHTML();
  }
  async function reload() {
    const epoch=authEpoch; loading=true; loadError=false; render();
    try { const data=await api.load(); if(epoch!==authEpoch)return; snapshot=data; demo=data.demo ?? newDemoRun(); ready=true; }
    catch { if(epoch!==authEpoch)return; loadError=true; snapshot=null; }
    finally { if(epoch===authEpoch){loading=false;render();} }
  }
  function readDemo(form) {
    const f=new FormData(form);
    return {...demo,demo_employer_id:f.get('employer') ? Number(f.get('employer')):null,demo_worker_id:f.get('worker')?Number(f.get('worker')):null,nearby_threshold_km:thresholdNumber(f.get('threshold')),employer_feedback:String(f.get('feedback')||''),matching_reason:String(f.get('reason')||''),contract_status:f.get('contract_status'),contract_evidence:String(f.get('evidence')||''),work_ended:f.has('ended'),wage_response:f.has('ended')?(f.get('wage')||null):null};
  }
  document.addEventListener('click',async event=>{
    const modeButton=event.target.closest('[data-employment-mode]');
    if(modeButton){mode=modeButton.dataset.employmentMode;report('');render();if(mode==='demo'&&!demoData){try{demoData=await loadDemo();if(!demoData)throw new Error('조회 실패');render();}catch{root.innerHTML='<p class="expansion-empty error">시연 DB 조회 실패. 임의 데이터로 대체하지 않았습니다.</p>';}}}
    if(event.target.closest('[data-employment-reload]')){report('');void reload();}
    if(event.target.closest('[data-demo-check-contract]')) report('시연용 예시: 전자계약 연동 준비 중입니다. 검증된 체결 근거가 없어 완료 처리하지 않았습니다.');
    const contractButton=event.target.closest('[data-check-contract]');
    if(contractButton){const id=contractButton.dataset.checkContract;await reload();const c=snapshot?.cases.find(i=>i.id===id)?.contract;report(loadError?'계약 상태 조회 실패. 완료 처리하지 않았습니다.':c?.status==='confirmed'&&c?.verification_source==='provider_verified'?`검증된 체결 기록을 조회했습니다. 확인 시점: ${formatTime(c.checked_at)}`:'전자계약 연동 준비 중입니다. 검증된 체결 근거가 없어 완료 처리하지 않았습니다.');}
    if(event.target.closest('[data-demo-compare]')){try{demo=readDemo(root.querySelector('#employment-demo-form'));render();report('시연용 예시 비교입니다. 아직 저장하지 않았습니다.');}catch(e){report(e.message);}}
    if(event.target.closest('[data-preview-distance]')){
      const epoch=++previewEpoch, session=authEpoch;
      try{threshold=root.querySelector('[name="threshold"]').value;const result=await api.preview(selectedJob,selectedWorker,threshold);if(epoch===previewEpoch&&session===authEpoch){assessment=result;render();report(`${distanceLabel(result)} · 직선거리이며 이동거리·통근시간이 아닙니다.`);}}catch(e){if(session===authEpoch)report(`거리 확인 불가: ${e.message}`);}
    }
  });
  root.addEventListener('change',event=>{
    if(event.target.closest('#employment-demo-form')&&event.target.name==='ended'){try{demo=readDemo(event.target.form);render();}catch(e){report(e.message);}}
    if(event.target.closest('#employment-manual-form')){
      const f=new FormData(event.target.form);selectedJob=String(f.get('job'));selectedWorker=String(f.get('worker'));threshold=String(f.get('threshold'));feedback=String(f.get('feedback'));notes=String(f.get('notes'));reason=String(f.get('reason'));
      if(['job','worker','threshold'].includes(event.target.name)){assessment=null;previewEpoch++;render();}
    }
  });
  root.addEventListener('submit',async event=>{
    event.preventDefault();const form=event.target;const f=new FormData(form);const button=event.submitter; const epoch=authEpoch;
    if(button)button.disabled=true; report('DB 저장 중…');
    try{
      if(form.id==='employment-demo-form'){
        const values=readDemo(form);if(!values.demo_employer_id||!values.demo_worker_id||!values.matching_reason.trim())throw new Error('시연 고용주·근로자와 수동 선택 근거를 입력하세요.');
        const saved=await api.saveDemo(values);if(epoch!==authEpoch)return;demo=saved;render();report('별도 시연 DB에 저장하고 다시 조회했습니다. 실제 계약·급여·이용 실적이 아닙니다.');return;
      }
      if(form.dataset.contractForm){await saveContract({introductionId:form.dataset.contractForm,status:f.get('status'),confirmationMethod:f.get('method'),evidenceReference:f.get('evidence')});}
      else if(form.dataset.wageForm){await saveWage({introductionId:form.dataset.wageForm,workerId:form.dataset.workerId,response:f.get('response'),responseNote:f.get('note')});}
      else if(form.dataset.assessmentForm){await assessCommute(form.dataset.assessmentForm,thresholdNumber(f.get('threshold')));}
      else if(form.id==='employment-manual-form'){
        const {jobs,workers}=eligibleData();const j=jobs.find(x=>x.id===f.get('job'));const w=workers.find(x=>x.id===f.get('worker'));
        if(!j||!w)throw new Error('허용된 공고와 근로자를 선택하세요.');
        const saved=await createManual({jobPostingId:j.id,workerId:w.id,employerFeedback:f.get('feedback'),comparisonNotes:f.get('notes'),selectionReason:f.get('reason'),operatingMode:j.is_test_data&&w.is_test_data?'development':'production'});
        try{await assessCommute(saved.id,thresholdNumber(f.get('threshold')));}catch(e){await reload();report(`수동 선택은 저장되었습니다. 거리 기록은 미완료: ${e.message}`);return;}
      }else if(form.id==='employment-personal-location-form'){
        const withdraw=button?.value==='withdraw';
        if(!withdraw&&!f.has('consent'))throw new Error('기본 위치정보 제공 동의를 선택하세요.');
        if(!withdraw) report('현재 기기 위치를 확인하고 서버 저장을 준비하고 있습니다…');
        const position=withdraw?null:await currentPosition();
        await api.savePersonalLocation({p_lat:position?.lat ?? null,p_lon:position?.lon ?? null,p_withdraw:withdraw});
        if(epoch!==authEpoch)return;
        await reload();
        const saved=snapshot?.personalLocation?.saved;
        if(loadError || (withdraw ? saved : !saved)) throw new Error('위치 요청 후 재조회 확인에 실패했습니다. 다시 조회해 주세요.');
        report(withdraw ? '내 기본 위치 삭제·동의 철회를 재조회했습니다.' : `내 기본 위치 자동 저장을 재조회했습니다. ${formatTime(snapshot.personalLocation.expires_at)}부터 조회가 차단되고 자동 삭제됩니다.`);
        return;
      }else if(form.id==='employment-location-form'){
        const item=snapshot.cases.find(i=>i.id===f.get('case'));const withdraw=button?.value==='withdraw';if(!item)throw new Error('근무 건을 선택하세요.');
        if(!withdraw&&!f.has('consent'))throw new Error('위치 제공 동의를 선택하세요.');
        if(!withdraw) report('현재 기기 위치를 확인하고 서버 저장을 준비하고 있습니다…');
        const position=withdraw?null:await currentPosition();
        await api.saveLocation({p_job_id:item.job_posting_id,p_worker_id:snapshot.role==='worker'?item.worker_id:null,p_lat:position?.lat ?? null,p_lon:position?.lon ?? null,p_consent_version:snapshot.readiness.location_consent_version,p_withdraw:withdraw});
        if(epoch!==authEpoch)return;
        await reload();
        const saved=snapshot?.cases.find(i=>i.id===item.id)?.own_location;
        if(loadError || (withdraw ? !!saved : !saved)) throw new Error('위치 요청 후 재조회 확인에 실패했습니다. 다시 조회해 주세요.');
        const commute=snapshot?.cases.find(i=>i.id===item.id)?.commute;
        report(withdraw ? '위치 좌표 삭제·동의 철회를 확인했습니다. 거리 공유도 해제됩니다.' : `현재 위치 자동 저장을 재조회했습니다. ${distanceLabel(commute)}. ${formatTime(saved.expires_at)}부터 조회·공유가 차단되고 1분 주기로 자동 삭제됩니다.`);
        return;
      }
      if(epoch!==authEpoch)return;await reload();report(loadError?'저장은 요청되었으나 재조회에 실패했습니다. 다시 조회해 주세요.':'DB에 저장하고 다시 조회했습니다. 계약·채용·결제를 자동 확정하지 않았습니다.');
    }catch(e){if(epoch===authEpoch)report(`저장 완료로 처리하지 않았습니다: ${e.message}`);}
    finally{if(button&&button.isConnected)button.disabled=false;}
  });
  render();
  function sessionChanged(session){authEpoch++;previewEpoch++;snapshot=null;demo=newDemoRun();assessment=null;selectedJob='';selectedWorker='';threshold='';feedback='';notes='';reason='';ready=false;loadError=false;loading=!!session;report('');render();if(session)void reload();}
  if(client){client.auth.getSession().then(({data})=>{if(!ready&&authEpoch===0)sessionChanged(data.session);});client.auth.onAuthStateChange((_event,session)=>{authEpoch++;snapshot=null;demo=newDemoRun();report('');render();const epoch=authEpoch;setTimeout(()=>{if(epoch===authEpoch)sessionChanged(session);},0);});}
}
