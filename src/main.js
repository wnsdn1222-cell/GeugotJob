import './styles.css';
import {
  supabase,
  isSupabaseConfigured,
  signUpWithEmail,
  signInWithEmail,
  signOut,
  getMyProfile,
  loadMvpData,
  saveEmployerProfile,
  saveWorkerProfile,
  createJobPosting,
  applyToJob,
  logDirectContact,
  saveServiceIntent,
  isJobInfoMvpDevelopment,
  draftConsentVersion,
  loadReservations,
  createReservation,
  cancelReservation
} from './supabase.js';

const app = document.querySelector('#app');

const icon = (name, size = 20) => {
  const paths = {
    arrow: '<path d="M5 12h14M14 7l5 5-5 5"/>',
    route: '<circle cx="6" cy="18" r="2"/><circle cx="18" cy="6" r="2"/><path d="M8 18h3a3 3 0 0 0 3-3V9a3 3 0 0 1 3-3"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.7 3.2 8 7.5 9.5 4.3-1.5 7.5-4.8 7.5-9.5V6L12 3Z"/><path d="m8.8 12 2 2 4.5-4.5"/>',
    briefcase: '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
    check: '<path d="m5 12 4 4L19 6"/>',
    spark: '<path d="m12 3 1.4 4.1 4.1 1.4-4.1 1.4L12 14l-1.4-4.1-4.1-1.4 4.1-1.4L12 3ZM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15Z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>'
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${paths[name]}</svg>`;
};

app.innerHTML = `
  <header class="site-header">
    <a class="brand" href="#top" aria-label="그곳잡 홈"><span class="brand-mark">ㄱ</span><b>그곳잡</b></a>
    <nav class="desktop-nav" aria-label="주요 메뉴"><a href="#how">이용 방법</a><a href="#matching">AI 매칭</a><a href="#visa">비자 지원</a><a href="#trust">신뢰 원칙</a></nav>
    <div class="header-actions"><a class="text-link" href="#for-worker">일자리 찾기</a><a class="button small" href="#start">인재 찾기 ${icon('arrow', 17)}</a></div>
    <button class="menu-button" type="button" aria-label="메뉴 열기" aria-expanded="false">${icon('menu', 24)}</button>
  </header>
  <div class="mobile-menu" aria-hidden="true"><a href="#how">이용 방법</a><a href="#matching">AI 매칭</a><a href="#visa">비자 지원</a><a href="#trust">신뢰 원칙</a><a href="#start">서비스 시작하기</a></div>

  <main id="main">
    <section class="hero" id="top">
      <img class="hero-photo" src="/hero-workplace.png" alt="물류 현장에서 함께 일하는 고용주와 근로자" />
      <div class="hero-shade"></div>
      <div class="hero-content">
        <p class="eyebrow light">현장을 아는 채용 매칭</p>
        <h1>사람을 찾는 일,<br><em>감이 아닌 근거로.</em></h1>
        <p class="hero-copy">통근 거리, 근무 경험, 의사소통, 체류 자격을 함께 살펴 현장에 맞는 사람과 일자리를 연결합니다.</p>
        <div class="hero-actions"><a class="button lime" href="#start">고용주로 시작하기 ${icon('arrow', 18)}</a><a class="button ghost" href="#for-worker">근로자로 시작하기</a></div>
        <p class="hero-note">AI는 판단을 돕고, 최종 채용은 사람이 결정합니다.</p>
      </div>
      <div class="match-preview" aria-label="추천 인재 예시">
        <div class="preview-top"><span>${icon('spark', 17)} 추천 인재</span><b>92<small>점</small></b></div>
        <div class="person"><span class="avatar">홍</span><div><strong>홍길동</strong><small>생산·포장 · 경력 3년</small></div><i>적합</i></div>
        <div class="factors"><span><b>8.4km</b>통근 거리</span><span><b>96</b>성실성</span><span><b>88</b>소통 능력</span></div>
        <p><span></span> 비자 조건 일치 · 유사 업무 경험 · 오전 근무 가능</p>
      </div>
      <div class="hero-index">01 — 04</div>
    </section>

    <section class="signal-strip" aria-label="서비스 주요 수치"><p>현장 채용의 중요한 조건을<br><strong>한 화면에서 확인하세요.</strong></p><div><strong>4가지</strong><span>핵심 매칭 근거</span></div><div><strong>100%</strong><span>사람의 최종 결정</span></div><div><strong>15,000P</strong><span>포인트 출금 기준</span></div></section>

    <section class="section intro" id="how">
      <div class="section-kicker"><span>01</span><p class="eyebrow">HOW IT WORKS</p></div>
      <div class="section-heading"><h2>공고부터 첫 출근까지,<br>흐름은 더 단순하게.</h2><p>필요한 조건을 입력하면 추천 근거가 정리됩니다. 제안과 응답, 채용 상태까지 한곳에서 이어집니다.</p></div>
      <div class="steps"><article><span>01</span><i>${icon('briefcase', 26)}</i><h3>조건을 알려주세요</h3><p>직무, 지역, 임금, 근무 시간과 필요한 체류 자격을 입력합니다.</p></article><article><span>02</span><i>${icon('spark', 26)}</i><h3>근거와 함께 추천해요</h3><p>거리, 성실성, 소통, 업무 경험을 나누어 보여드립니다.</p></article><article><span>03</span><i>${icon('check', 26)}</i><h3>직접 만나 결정하세요</h3><p>면접을 제안하고, 사람의 판단으로 최종 채용을 확정합니다.</p></article></div>
    </section>

    <section class="matching-section" id="matching">
      <div class="matching-copy"><div class="section-kicker"><span>02</span><p class="eyebrow light">EXPLAINABLE MATCHING</p></div><h2>점수보다 중요한 건,<br><em>왜 맞는지</em>입니다.</h2><p>한 줄짜리 총점에 기대지 않습니다. 현장에서 확인해야 할 네 가지 조건과 추천 이유를 함께 보여드립니다.</p><ul><li>${icon('check', 17)} 부족한 정보는 낮은 점수가 아닌 ‘정보 부족’으로 표시</li><li>${icon('check', 17)} 국적·성별·연령은 업무 적합도 점수에서 제외</li><li>${icon('check', 17)} AI에 의한 자동 탈락·자동 채용 금지</li></ul></div>
      <div class="score-card"><div class="score-head"><div><span>현재 공고</span><strong>시흥 2공장 · 생산 포장</strong></div><b>추천 12명</b></div><div class="candidate"><div class="candidate-main"><span class="avatar blue">KM</span><div><strong>김민준</strong><small>생산·조립 · 경력 4년</small></div><i>94점</i></div><div class="bar"><span style="width:94%"></span></div></div><div class="score-grid"><div><span>출퇴근 가능성</span><b>91</b><small>6.2km · 약 22분</small></div><div><span>성실성</span><b>97</b><small>최근 출근율 98%</small></div><div><span>의사소통</span><b>88</b><small>업무 지시 이해 원활</small></div><div><span>업무 능력</span><b>94</b><small>동일 직무 4년</small></div></div><div class="reason"><span>${icon('spark', 18)}</span><p><b>추천 근거</b>동일 직무 경험이 있고, 대중교통으로 출근 가능하며, 최근 근무 이력이 안정적입니다.</p></div><small class="model-note">추천 모델 v1.2 · 최종 결정권은 고용주에게 있습니다.</small></div>
    </section>

    <section class="section dual-audience">
      <div class="section-kicker"><span>03</span><p class="eyebrow">BUILT FOR BOTH</p></div>
      <div class="audience-grid"><article><span class="audience-no">고용주</span><h2>필요한 사람을<br>더 정확하게.</h2><p>회사 인증 후 공고를 등록하고, 조건별 추천 근거를 비교해 면접을 제안할 수 있습니다.</p><ul><li>공고별 추천 현황</li><li>인재 비교와 면접 제안</li><li>채용 상태와 일정 관리</li></ul><a href="#start">인재 찾기 ${icon('arrow', 18)}</a></article><article id="for-worker"><span class="audience-no">근로자</span><h2>내 조건에 맞는<br>일자리를 더 가깝게.</h2><p>희망 직종과 근무 가능 시간을 등록하고, 면접 제안부터 근무 완료와 포인트까지 확인합니다.</p><ul><li>내 조건에 맞는 일자리</li><li>면접 제안 수락·거절</li><li>근무 리워드 포인트</li></ul><a href="#start">일자리 찾기 ${icon('arrow', 18)}</a></article></div>
    </section>

    <section class="visa-section" id="visa">
      <div><div class="section-kicker"><span>04</span><p class="eyebrow light">VISA & ADMIN SUPPORT</p></div><h2>외국인 채용,<br>자격 확인부터 함께.</h2><p>체류 자격과 취업 가능 조건을 먼저 확인하고, 필요한 경우 전문 행정 파트너와 연결합니다.</p><a class="button ghost" href="#start">비자 지원 알아보기 ${icon('arrow', 18)}</a></div>
      <div class="visa-list"><article><i>${icon('shield', 22)}</i><div><b>체류 자격 사전 확인</b><span>근무 업종과 기간에 맞는 기본 조건 확인</span></div></article><article><i>${icon('globe', 22)}</i><div><b>단기 근로 행정 안내</b><span>워킹홀리데이·단기 취업 관련 절차 안내</span></div></article><article><i>${icon('route', 22)}</i><div><b>전문 파트너 연결</b><span>동의 후 필요한 정보와 진행 상태를 안전하게 전달</span></div></article><p>비자 발급 여부는 관계 기관의 심사 결과에 따라 결정되며, 그곳잡은 발급을 보장하지 않습니다.</p></div>
    </section>

    <section class="section trust" id="trust"><div class="section-heading"><h2>더 공정한 연결을 위한<br>그곳잡의 원칙.</h2><p>채용의 속도만큼 정보의 안전과 판단의 투명성을 중요하게 생각합니다.</p></div><div class="trust-grid"><article><b>01</b><h3>민감 정보는 최소한으로</h3><p>매칭과 채용에 필요한 범위 안에서만 정보를 보여줍니다.</p></article><article><b>02</b><h3>추천과 결정은 분리해서</h3><p>AI는 근거를 제시하지만 채용 여부를 대신 결정하지 않습니다.</p></article><article><b>03</b><h3>포인트는 기록부터 투명하게</h3><p>적립과 차감 내역을 거래 단위로 남기고 중복 지급을 막습니다.</p></article></div></section>

    <section class="start-section" id="start"><span class="brand-mark large">ㄱ</span><p class="eyebrow light">MEMBER & RESERVATION</p><h2>가입부터 예약까지,<br>한곳에서 관리하세요.</h2><div class="start-choices"><button class="button lime" data-start="employer">고용주로 시작하기 ${icon('arrow', 18)}</button><button class="button ghost" data-start="worker">근로자로 시작하기</button></div><div id="member-app" class="member-app" aria-live="polite"></div></section>
  </main>

  <footer><a class="brand" href="#top"><span class="brand-mark">ㄱ</span><b>그곳잡</b></a><p>현장에 맞는 사람과 일을, 근거로 연결합니다.</p><div><a href="#">개인정보 처리방침</a><a href="#">이용약관</a><a href="#">포인트 정책</a></div><small>© 2026 그곳잡. All rights reserved.</small></footer>
`;

const menuButton = document.querySelector('.menu-button');
const mobileMenu = document.querySelector('.mobile-menu');

function toggleMenu(force) {
  const open = force ?? !mobileMenu.classList.contains('open');
  mobileMenu.classList.toggle('open', open);
  mobileMenu.setAttribute('aria-hidden', String(!open));
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? '메뉴 닫기' : '메뉴 열기');
  menuButton.innerHTML = icon(open ? 'close' : 'menu', 24);
}

menuButton.addEventListener('click', () => toggleMenu());
mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => toggleMenu(false)));
const memberApp = document.querySelector('#member-app');
let authMode = 'login';
let selectedRole = 'worker';
let dashboardNotice = '';

const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
})[character]);

const reservationLabels = {
  interview: '면접', consultation: '상담', work_start: '첫 출근', other: '기타',
  requested: '요청됨', confirmed: '확정', cancelled: '취소', completed: '완료'
};

const wageLabels = { hourly: '시급', daily: '일급', monthly: '월급', annual: '연봉', negotiable: '협의' };

function setFormMessage(form, message, type = '') {
  const status = form?.querySelector('.form-status');
  if (!status) return;
  status.className = `form-status ${type}`.trim();
  status.textContent = message;
}

function formText(form, name) {
  return String(form.get(name) ?? '').trim();
}

function setMemberMessage(message, type = '') {
  const status = memberApp.querySelector('.form-status');
  if (!status) return;
  status.className = `form-status ${type}`.trim();
  status.textContent = message;
}

function renderAuth() {
  if (!isSupabaseConfigured) {
    memberApp.innerHTML = '<div class="setup-note"><b>연결 설정이 필요합니다.</b><p><code>.env</code>에 Supabase URL과 Publishable Key를 입력하면 로그인과 예약 기능이 활성화됩니다.</p></div>';
    return;
  }

  const isSignup = authMode === 'signup';
  memberApp.innerHTML = `
    <div class="auth-card">
      <div class="auth-tabs" role="tablist">
        <button type="button" class="${!isSignup ? 'active' : ''}" data-auth-mode="login">로그인</button>
        <button type="button" class="${isSignup ? 'active' : ''}" data-auth-mode="signup">회원가입</button>
      </div>
      <form id="auth-form">
        ${isSignup ? `<label>이름<input name="fullName" autocomplete="name" maxlength="60" required placeholder="홍길동"></label><label>회원 유형<select name="role"><option value="worker" ${selectedRole === 'worker' ? 'selected' : ''}>근로자</option><option value="employer" ${selectedRole === 'employer' ? 'selected' : ''}>고용주</option></select></label>` : ''}
        <label>이메일<input type="email" name="email" autocomplete="email" required placeholder="name@example.com"></label>
        <label>비밀번호<input type="password" name="password" autocomplete="${isSignup ? 'new-password' : 'current-password'}" minlength="8" required placeholder="영문·숫자를 포함한 8자 이상"></label>
        ${isSignup ? '<label>비밀번호 확인<input type="password" name="passwordConfirm" autocomplete="new-password" minlength="8" required placeholder="비밀번호를 다시 입력하세요"></label>' : ''}
        <button class="button lime" type="submit">${isSignup ? '회원가입' : '로그인'}</button>
        <p class="form-status" role="status"></p>
      </form>
    </div>`;

  memberApp.querySelectorAll('[data-auth-mode]').forEach((button) => button.addEventListener('click', () => {
    authMode = button.dataset.authMode;
    renderAuth();
  }));

  memberApp.querySelector('#auth-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    const submitButton = event.currentTarget.querySelector('[type="submit"]');
    const form = new FormData(event.currentTarget);
    submitButton.disabled = true;
    setMemberMessage('처리 중입니다…');
    try {
      if (isSignup) {
        if (form.get('password') !== form.get('passwordConfirm')) {
          throw new Error('비밀번호가 서로 일치하지 않습니다.');
        }
        const result = await signUpWithEmail({
          email: form.get('email'), password: form.get('password'),
          fullName: form.get('fullName'), role: form.get('role')
        });
        if (result.session) {
          await renderDashboard(result.session);
          return;
        }
        throw new Error('회원가입을 완료할 수 없습니다. 이미 가입한 이메일이라면 로그인해 주세요.');
      } else {
        await signInWithEmail({ email: form.get('email'), password: form.get('password') });
      }
    } catch (error) {
      setMemberMessage(error.message, 'error');
    } finally {
      submitButton.disabled = false;
    }
  });
}

function reservationItem(reservation) {
  const when = new Intl.DateTimeFormat('ko-KR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(reservation.reserved_at));
  return `<article class="reservation-item">
    <div><span>${escapeHtml(reservationLabels[reservation.reservation_type] ?? reservation.reservation_type)}</span><span class="status ${escapeHtml(reservation.status)}">${escapeHtml(reservationLabels[reservation.status] ?? reservation.status)}</span></div>
    <h4>${escapeHtml(reservation.title)}</h4><p>${escapeHtml(when)}${reservation.location ? ` · ${escapeHtml(reservation.location)}` : ''}</p>
    ${reservation.notes ? `<small>${escapeHtml(reservation.notes)}</small>` : ''}
    ${reservation.status !== 'cancelled' && reservation.status !== 'completed' ? `<button type="button" data-cancel-reservation="${reservation.id}">예약 취소</button>` : ''}
  </article>`;
}

function draftConsentCheckbox(label) {
  return `<label class="consent-check"><input type="checkbox" name="draft_consent" required><span>${escapeHtml(label)} <b>(${escapeHtml(draftConsentVersion)} · 법률 검토 전 초안)</b></span></label>`;
}

function serviceIntentPanel(role, intents) {
  return `<form id="service-intent-form" class="mvp-card mvp-form">
    <div class="card-title"><span>이용 의향</span><h3>필요한 서비스를 알려주세요.</h3><p>개발 검증용으로 요구사항과 이용 의향을 기록합니다. 결제는 연결되지 않습니다.</p></div>
    <label>현재 필요한 내용<textarea name="needs" rows="3" maxlength="2000" required placeholder="예: 주 5일 포장 업무를 찾고 있어요."></textarea></label>
    <label>이용 의향<select name="usage_intent"><option value="considering">검토 중</option><option value="likely">이용 의향 있음</option><option value="ready">준비되면 이용</option></select></label>
    <label>연락 선호<select name="preferred_contact"><option value="none">연락 원하지 않음</option><option value="email">이메일</option><option value="phone">전화</option></select></label>
    ${draftConsentCheckbox('요구사항 및 서비스 이용 의향 저장에 동의합니다.')}
    <button class="button lime" type="submit">이용 의향 저장</button><p class="form-status" role="status"></p>
    <small class="saved-count">저장된 기록 ${intents.length}건</small>
  </form>`;
}

function employerMvp(profile, data) {
  const company = data.details ?? {};
  const jobs = data.jobs ?? [];
  return `<div class="mvp-stack">
    <div class="compliance-banner"><b>개발 검증 모드</b><p>직업정보제공사업 신고 완료가 확인되지 않아 실제 운영은 잠겨 있습니다. 운영자 구직자 소개와 고객 결제는 제공하지 않습니다.</p></div>
    <div class="mvp-grid">
      <form id="employer-profile-form" class="mvp-card mvp-form">
        <div class="card-title"><span>고용주 정보</span><h3>사업장과 연락처</h3></div>
        <label>담당자 이름<input name="full_name" maxlength="60" required value="${escapeHtml(profile.full_name || '')}"></label>
        <label>회사명<input name="company_name" maxlength="120" required value="${escapeHtml(company.company_name || '')}"></label>
        <label>사업자등록번호<input name="business_number" maxlength="30" value="${escapeHtml(company.business_number || '')}" placeholder="선택 입력"></label>
        <label>지역<input name="city" maxlength="80" required value="${escapeHtml(company.city || '')}" placeholder="예: 안산시"></label>
        <label>사업장 주소<input name="workplace_address" maxlength="240" required value="${escapeHtml(company.workplace_address || '')}"></label>
        <label>연락 담당자<input name="contact_name" maxlength="80" required value="${escapeHtml(company.contact_name || profile.full_name || '')}"></label>
        <label>이메일<input type="email" name="contact_email" value="${escapeHtml(company.contact_email || '')}"></label>
        <label>전화번호<input name="contact_phone" value="${escapeHtml(company.contact_phone || profile.phone || '')}"></label>
        ${draftConsentCheckbox('고용주 정보 저장 및 지원자에게 연락처 공개에 동의합니다.')}
        <button class="button lime" type="submit">고용주 정보 저장</button><p class="form-status" role="status"></p>
      </form>
      <form id="job-form" class="mvp-card mvp-form">
        <div class="card-title"><span>구인 공고</span><h3>실제 근무조건 등록</h3><p>입력한 근무조건을 확인한 공고만 게시됩니다.</p></div>
        <label>공고 제목<input name="title" maxlength="120" required></label>
        <label>직종<input name="job_category" maxlength="100" required placeholder="예: 생산·포장"></label>
        <label>고용 형태<input name="employment_type" maxlength="80" required placeholder="예: 기간제 근로"></label>
        <label>지역<input name="city" maxlength="80" required value="${escapeHtml(company.city || '')}"></label>
        <label>실제 근무지<input name="workplace_address" maxlength="240" required value="${escapeHtml(company.workplace_address || '')}"></label>
        <div class="inline-fields"><label>근무 요일<input name="work_days" maxlength="100" required placeholder="월~금"></label><label>근무 시간<input name="work_hours" maxlength="100" required placeholder="09:00~18:00"></label></div>
        <div class="inline-fields"><label>임금 구분<select name="wage_type"><option value="hourly">시급</option><option value="daily">일급</option><option value="monthly">월급</option><option value="annual">연봉</option><option value="negotiable">협의</option></select></label><label>금액(원)<input type="number" name="wage_amount" min="0" required></label></div>
        <label>임금 상세<input name="wage_notes" maxlength="300" placeholder="수당·지급일 등"></label>
        <div class="inline-fields"><label>모집 인원<input type="number" name="headcount" min="1" value="1" required></label><label>근무 시작일<input type="date" name="starts_on"></label></div>
        <label>근무 종료일<input type="date" name="ends_on"></label>
        <label>업무 및 기타 조건<textarea name="description" rows="4" maxlength="3000"></textarea></label>
        <label>연락 방식<select name="preferred_channel"><option value="email">이메일</option><option value="phone">전화</option></select></label>
        <label class="consent-check"><input type="checkbox" name="conditions_confirmed" required><span>공고 내용이 실제 근무조건과 일치함을 확인했습니다.</span></label>
        ${draftConsentCheckbox('지원자에게 담당자 연락처를 공개하는 데 동의합니다.')}
        <button class="button lime" type="submit" ${company.id ? '' : 'disabled'}>${company.id ? '개발용 공고 게시' : '고용주 정보를 먼저 저장하세요'}</button><p class="form-status" role="status"></p>
      </form>
    </div>
    <div class="mvp-card"><div class="list-head"><span>내 공고와 지원자</span><b>${jobs.length}건</b></div>
      ${jobs.length ? jobs.map((job) => `<article class="job-item"><div class="job-heading"><div><small>${escapeHtml(job.operating_mode === 'development' ? '개발 검증' : '운영')}</small><h4>${escapeHtml(job.title)}</h4></div><span class="status">${escapeHtml(job.publication_status)}</span></div><p>${escapeHtml(job.company_name || '')} · ${escapeHtml(job.workplace_address || job.city)}</p><p>${escapeHtml(job.work_days)} ${escapeHtml(job.work_hours)} · ${escapeHtml(wageLabels[job.wage_type])} ${job.wage_amount == null ? '협의' : Number(job.wage_amount).toLocaleString('ko-KR') + '원'}</p><div class="applicant-list">${job.applications?.length ? job.applications.map((item) => `<div><b>${escapeHtml(item.applicant_name)}</b><span>${escapeHtml(item.contact_email || item.contact_phone || '')}</span>${item.message ? `<p>${escapeHtml(item.message)}</p>` : ''}</div>`).join('') : '<small>아직 지원자가 없습니다.</small>'}</div></article>`).join('') : '<p class="empty-state">등록된 공고가 없습니다.</p>'}
    </div>
    ${serviceIntentPanel('employer', data.intents ?? [])}
  </div>`;
}

function workerMvp(profile, data) {
  const worker = data.details ?? {};
  const applications = data.applications ?? [];
  const contacts = data.contacts ?? [];
  const jobs = data.jobs ?? [];
  return `<div class="mvp-stack">
    <div class="compliance-banner"><b>개발 검증 모드</b><p>공고 확인·직접 지원·직접 연락 흐름만 검증합니다. 운영자 소개와 결제는 제공하지 않습니다.</p></div>
    <div class="mvp-grid">
      <form id="worker-profile-form" class="mvp-card mvp-form">
        <div class="card-title"><span>근로자 정보</span><h3>구직 정보와 연락처</h3></div>
        <label>이름<input name="full_name" maxlength="60" required value="${escapeHtml(profile.full_name || '')}"></label>
        <label>국적<input name="nationality" maxlength="80" required value="${escapeHtml(worker.nationality || '대한민국')}"></label>
        <label>희망 직종<input name="job_category" maxlength="100" required value="${escapeHtml(worker.job_category || '')}"></label>
        <label>희망 지역<input name="city" maxlength="80" required value="${escapeHtml(worker.city || '')}"></label>
        <label>경력(개월)<input type="number" name="experience_months" min="0" value="${Number(worker.experience_months || 0)}" required></label>
        <label>근무 가능일<input type="date" name="availability_date" value="${escapeHtml(worker.availability_date || '')}"></label>
        <label>이메일<input type="email" name="contact_email" value="${escapeHtml(worker.contact_email || '')}"></label>
        <label>전화번호<input name="contact_phone" value="${escapeHtml(worker.contact_phone || profile.phone || '')}"></label>
        <label>경력 요약<textarea name="experience_summary" rows="3" maxlength="2000">${escapeHtml(worker.experience_summary || '')}</textarea></label>
        <label>희망 근무조건<textarea name="desired_conditions" rows="3" maxlength="2000">${escapeHtml(worker.desired_conditions || '')}</textarea></label>
        ${draftConsentCheckbox('근로자 구직 정보와 연락처 저장에 동의합니다.')}
        <button class="button lime" type="submit">근로자 정보 저장</button><p class="form-status" role="status"></p>
      </form>
      <div class="mvp-card jobs-panel"><div class="list-head"><span>확인 가능한 공고</span><b>${jobs.length}건</b></div>
        ${jobs.length ? jobs.map((job) => {
          const application = applications.find((item) => item.job_posting_id === job.id);
          const contact = contacts.find((item) => item.job_posting_id === job.id);
          return `<article class="job-item"><div class="job-heading"><div><small>실제 근무조건</small><h4>${escapeHtml(job.title)}</h4></div><span class="status">개발 검증</span></div><p><b>${escapeHtml(job.company_name || '회사명 미입력')}</b> · ${escapeHtml(job.workplace_address || job.city)}</p><dl><div><dt>직종·고용</dt><dd>${escapeHtml(job.job_category)} · ${escapeHtml(job.employment_type)}</dd></div><div><dt>근무</dt><dd>${escapeHtml(job.work_days)} ${escapeHtml(job.work_hours)}</dd></div><div><dt>임금</dt><dd>${escapeHtml(wageLabels[job.wage_type])} ${job.wage_amount == null ? '협의' : Number(job.wage_amount).toLocaleString('ko-KR') + '원'} ${escapeHtml(job.wage_notes || '')}</dd></div><div><dt>기간</dt><dd>${escapeHtml(job.starts_on || '협의')} ~ ${escapeHtml(job.ends_on || '협의')}</dd></div></dl>${job.description ? `<p>${escapeHtml(job.description)}</p>` : ''}
            ${application ? `<div class="applied-box"><b>지원 완료</b>${contact ? `<p>${escapeHtml(contact.contact_name)} 담당자에게 직접 연락할 수 있습니다.</p><div class="contact-actions">${contact.contact_email ? `<a class="button lime" href="mailto:${escapeHtml(contact.contact_email)}" data-direct-contact="${application.id}" data-channel="email">이메일 보내기</a>` : ''}${contact.contact_phone ? `<a class="button" href="tel:${escapeHtml(contact.contact_phone)}" data-direct-contact="${application.id}" data-channel="phone">전화하기</a>` : ''}</div>` : '<p>연락처를 불러오는 중입니다.</p>'}</div>` : `<form class="application-form" data-job-id="${job.id}"><label>지원 메시지<textarea name="message" rows="2" maxlength="2000" placeholder="간단한 지원 내용을 입력하세요."></textarea></label><label>회신 이메일<input type="email" name="contact_email" value="${escapeHtml(worker.contact_email || '')}"></label><label>회신 전화번호<input name="contact_phone" value="${escapeHtml(worker.contact_phone || '')}"></label>${draftConsentCheckbox('이 공고의 고용주에게 지원 정보와 연락처를 제공하는 데 동의합니다.')}<button class="button lime" type="submit" ${worker.id ? '' : 'disabled'}>${worker.id ? '직접 지원하기' : '근로자 정보를 먼저 저장하세요'}</button><p class="form-status" role="status"></p></form>`}
          </article>`;
        }).join('') : '<p class="empty-state">현재 개발 검증용 공고가 없습니다.</p>'}
      </div>
    </div>
    ${serviceIntentPanel('worker', data.intents ?? [])}
  </div>`;
}

async function renderDashboard(session) {
  memberApp.innerHTML = '<p class="member-loading">회원 정보와 저장된 데이터를 불러오는 중입니다…</p>';
  try {
    const [profileResult, reservationsResult, mvpResult] = await Promise.allSettled([
      getMyProfile(),
      loadReservations(),
      isJobInfoMvpDevelopment ? getMyProfile().then((profile) => loadMvpData(profile.role)) : Promise.resolve(null)
    ]);
    const fallbackRole = session.user.user_metadata?.role === 'employer' ? 'employer' : 'worker';
    const profile = profileResult.status === 'fulfilled'
      ? profileResult.value
      : { role: fallbackRole, full_name: session.user.user_metadata?.full_name || '' };
    const reservations = reservationsResult.status === 'fulfilled' ? reservationsResult.value : [];
    const mvpData = mvpResult.status === 'fulfilled' ? mvpResult.value : null;
    const hasLoadWarning = profileResult.status === 'rejected' || reservationsResult.status === 'rejected' || (isJobInfoMvpDevelopment && mvpResult.status === 'rejected');
    const mvpContent = isJobInfoMvpDevelopment
      ? (mvpData ? (profile.role === 'employer' ? employerMvp(profile, mvpData) : workerMvp(profile, mvpData)) : '<div class="dashboard-warning"><p><b>MVP 데이터를 불러오지 못했습니다.</b><br>저장 기능은 실행하지 않았습니다.</p><button type="button" id="retry-mvp">다시 불러오기</button></div>')
      : '<div class="compliance-banner locked"><b>직업정보 MVP 준비 완료 · 운영 잠금</b><p>직업정보제공사업 신고 완료가 확인되기 전에는 공고 등록·지원·직접 연락 기능을 운영하지 않습니다. 개발 환경에서만 기능을 검증할 수 있습니다.</p></div>';
    const notice = dashboardNotice;
    dashboardNotice = '';
    memberApp.innerHTML = `
      <div class="dashboard-head"><div><span>${profile.role === 'employer' ? '고용주' : '근로자'} 회원</span><h3>${escapeHtml(profile.full_name || session.user.email)}</h3><p>${escapeHtml(session.user.email)}</p></div><button type="button" class="button ghost" id="sign-out">로그아웃</button></div>
      ${notice ? `<div class="dashboard-notice">${escapeHtml(notice)}</div>` : ''}
      ${hasLoadWarning ? '<div class="dashboard-warning"><p><b>로그인은 정상적으로 완료되었습니다.</b><br>일부 정보를 잠시 불러오지 못했습니다.</p><button type="button" id="retry-dashboard">다시 불러오기</button></div>' : ''}
      ${mvpContent}
      <div class="reservation-grid">
        <form id="reservation-form" class="reservation-form">
          <div><span>새 예약</span><h3>일정을 등록하세요.</h3></div>
          <label>예약 종류<select name="reservation_type"><option value="interview">면접</option><option value="consultation">상담</option><option value="work_start">첫 출근</option><option value="other">기타</option></select></label>
          <label>예약명<input name="title" maxlength="120" required placeholder="예: 안산 물류센터 면접"></label>
          <label>예약 일시<input type="datetime-local" name="reserved_at" required></label>
          <label>장소<input name="location" maxlength="200" placeholder="주소 또는 온라인"></label>
          <label>메모<textarea name="notes" rows="3" maxlength="1000" placeholder="필요한 내용을 적어주세요."></textarea></label>
          <button class="button lime" type="submit">예약 등록</button><p class="form-status" role="status"></p>
        </form>
        <div class="reservation-list"><div class="list-head"><span>내 예약</span><b>${reservations.length}건</b></div>${reservations.length ? reservations.map(reservationItem).join('') : '<p class="empty-state">아직 등록된 예약이 없습니다.</p>'}</div>
      </div>`;

    memberApp.querySelector('#sign-out').addEventListener('click', signOut);
    memberApp.querySelector('#retry-dashboard')?.addEventListener('click', () => renderDashboard(session));
    memberApp.querySelector('#retry-mvp')?.addEventListener('click', () => renderDashboard(session));

    memberApp.querySelector('#employer-profile-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      const button = element.querySelector('[type="submit"]');
      if (!formText(form, 'contact_email') && !formText(form, 'contact_phone')) {
        setFormMessage(element, '이메일 또는 전화번호 중 하나를 입력해 주세요.', 'error');
        return;
      }
      button.disabled = true;
      setFormMessage(element, '고용주 정보를 저장하는 중입니다…');
      try {
        await saveEmployerProfile({
          full_name: formText(form, 'full_name'), company_name: formText(form, 'company_name'),
          business_number: formText(form, 'business_number'), city: formText(form, 'city'),
          workplace_address: formText(form, 'workplace_address'), contact_name: formText(form, 'contact_name'),
          contact_email: formText(form, 'contact_email'), contact_phone: formText(form, 'contact_phone')
        });
        dashboardNotice = '고용주 정보가 DB에 저장되고 다시 조회되었습니다.';
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, `저장되지 않았습니다: ${error.message}`, 'error');
        button.disabled = false;
      }
    });

    memberApp.querySelector('#worker-profile-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      const button = element.querySelector('[type="submit"]');
      if (!formText(form, 'contact_email') && !formText(form, 'contact_phone')) {
        setFormMessage(element, '이메일 또는 전화번호 중 하나를 입력해 주세요.', 'error');
        return;
      }
      button.disabled = true;
      setFormMessage(element, '근로자 정보를 저장하는 중입니다…');
      try {
        await saveWorkerProfile({
          full_name: formText(form, 'full_name'), nationality: formText(form, 'nationality'),
          job_category: formText(form, 'job_category'), city: formText(form, 'city'),
          experience_months: Number(form.get('experience_months')), availability_date: formText(form, 'availability_date'),
          contact_email: formText(form, 'contact_email'), contact_phone: formText(form, 'contact_phone'),
          experience_summary: formText(form, 'experience_summary'), desired_conditions: formText(form, 'desired_conditions')
        });
        dashboardNotice = '근로자 정보가 DB에 저장되고 다시 조회되었습니다.';
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, `저장되지 않았습니다: ${error.message}`, 'error');
        button.disabled = false;
      }
    });

    memberApp.querySelector('#job-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      const button = element.querySelector('[type="submit"]');
      const company = mvpData?.details;
      if (!company?.id) return setFormMessage(element, '고용주 정보를 먼저 저장해 주세요.', 'error');
      if (!company.contact_email && !company.contact_phone) return setFormMessage(element, '고용주 연락처를 먼저 저장해 주세요.', 'error');
      button.disabled = true;
      setFormMessage(element, '공고와 연락처를 DB에 저장하는 중입니다…');
      try {
        await createJobPosting({
          title: formText(form, 'title'), job_category: formText(form, 'job_category'), city: formText(form, 'city'),
          company_name: company.company_name, workplace_address: formText(form, 'workplace_address'),
          employment_type: formText(form, 'employment_type'), work_days: formText(form, 'work_days'), work_hours: formText(form, 'work_hours'),
          wage_type: formText(form, 'wage_type'), wage_amount: Number(form.get('wage_amount')), wage_notes: formText(form, 'wage_notes'),
          headcount: Number(form.get('headcount')), starts_on: formText(form, 'starts_on'), ends_on: formText(form, 'ends_on'),
          description: formText(form, 'description'), contact_name: company.contact_name,
          contact_email: company.contact_email, contact_phone: company.contact_phone,
          preferred_channel: formText(form, 'preferred_channel')
        });
        dashboardNotice = '공고와 실제 근무조건이 DB에 저장되고 목록에서 다시 조회되었습니다.';
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, `게시되지 않았습니다: ${error.message}`, 'error');
        button.disabled = false;
      }
    });

    memberApp.querySelectorAll('.application-form').forEach((applicationForm) => applicationForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      const button = element.querySelector('[type="submit"]');
      if (!formText(form, 'contact_email') && !formText(form, 'contact_phone')) {
        setFormMessage(element, '고용주가 회신할 이메일 또는 전화번호를 입력해 주세요.', 'error');
        return;
      }
      button.disabled = true;
      setFormMessage(element, '지원 정보를 저장하는 중입니다…');
      try {
        await applyToJob({
          jobPostingId: element.dataset.jobId,
          workerId: mvpData.details.id,
          message: formText(form, 'message'),
          contactEmail: formText(form, 'contact_email'),
          contactPhone: formText(form, 'contact_phone')
        });
        dashboardNotice = '지원 정보가 DB에 저장되었습니다. 이제 고용주에게 직접 연락할 수 있습니다.';
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, `지원되지 않았습니다: ${error.message}`, 'error');
        button.disabled = false;
      }
    }));

    memberApp.querySelectorAll('[data-direct-contact]').forEach((link) => link.addEventListener('click', async (event) => {
      event.preventDefault();
      try {
        await logDirectContact(link.dataset.directContact, link.dataset.channel);
        window.location.href = link.href;
      } catch (error) {
        window.alert(`연락 기록을 저장하지 못해 연결하지 않았습니다: ${error.message}`);
      }
    }));

    memberApp.querySelector('#service-intent-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      const button = element.querySelector('[type="submit"]');
      button.disabled = true;
      setFormMessage(element, '이용 의향을 저장하는 중입니다…');
      try {
        await saveServiceIntent({
          role: profile.role, needs: formText(form, 'needs'),
          usageIntent: formText(form, 'usage_intent'), preferredContact: formText(form, 'preferred_contact')
        });
        dashboardNotice = '고객 요구와 서비스 이용 의향이 DB에 저장되고 다시 조회되었습니다.';
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, `저장되지 않았습니다: ${error.message}`, 'error');
        button.disabled = false;
      }
    });

    memberApp.querySelector('#reservation-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const button = element.querySelector('[type="submit"]');
      const form = new FormData(element);
      button.disabled = true;
      setFormMessage(element, '예약을 등록하는 중입니다…');
      try {
        await createReservation({
          reservation_type: form.get('reservation_type'), title: form.get('title').trim(),
          reserved_at: new Date(form.get('reserved_at')).toISOString(),
          location: form.get('location').trim() || null, notes: form.get('notes').trim() || null
        });
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, error.message, 'error');
        button.disabled = false;
      }
    });
    memberApp.querySelectorAll('[data-cancel-reservation]').forEach((button) => button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        await cancelReservation(button.dataset.cancelReservation);
        await renderDashboard(session);
      } catch (error) {
        button.disabled = false;
        window.alert(error.message);
      }
    }));
  } catch (error) {
    memberApp.innerHTML = `<div class="setup-note"><b>정보를 불러오지 못했습니다.</b><p>${escapeHtml(error.message)}</p><button class="button ghost" id="sign-out">로그아웃</button></div>`;
    memberApp.querySelector('#sign-out').addEventListener('click', signOut);
  }
}

document.querySelectorAll('[data-start]').forEach((button) => button.addEventListener('click', () => {
  selectedRole = button.dataset.start;
  authMode = 'signup';
  renderAuth();
  memberApp.scrollIntoView({ behavior: 'smooth', block: 'center' });
}));

if (supabase) {
  supabase.auth.getSession().then(({ data }) => data.session ? renderDashboard(data.session) : renderAuth());
  supabase.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(() => session ? renderDashboard(session) : renderAuth(), 0);
  });
} else {
  renderAuth();
}

const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) entry.target.classList.add('revealed');
}), { threshold: 0.12 });
document.querySelectorAll('.section, .matching-section, .visa-section').forEach((section) => observer.observe(section));
