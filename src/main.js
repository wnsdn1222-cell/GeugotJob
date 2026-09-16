import './styles.css';
import { workerInformationSection, matchingSection, visaSection, pointsSection, initExpansionExperience } from './expansion.js';
import { loadExpansionSnapshot } from './expansion-data.js';
import { employmentSection, initEmploymentUI } from './employment.js';
import { createEmploymentApi } from './employment-data.js';
import { demoDataLabel, prototypeTargetStats, demoRecommendation, demoInterview } from './demo-data.js';
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
  isClosedBetaDevelopment,
  isOpenBetaDevelopment,
  isServiceLaunchDevelopment,
  loadClosedBetaConsole,
  loadOpenBetaConsole,
  loadOpenBetaMemberData,
  saveClosedBetaParticipant,
  createManualIntroduction,
  saveContractConfirmation,
  savePaymentPreparation,
  saveWorkOutcome,
  calculateCommuteAssessment,
  saveWagePaymentResponse,
  saveReuseIntention,
  saveMatchingCriterion,
  saveOperatingCost,
  loadDemoRecords,
  loadDemoMarketplace,
  createDemoInterviewRequest,
  decideDemoInterviewRequest,
  loadServiceLaunchConsole,
  loadServiceLaunchMemberData,
  syncServiceCase,
  saveEmployerFeedback,
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
    <a class="brand" href="#start" aria-label="그곳잡 홈"><span class="brand-mark">ㄱ</span><b>그곳잡</b></a>
    <nav class="desktop-nav" aria-label="주요 메뉴"><a href="#top">서비스 소개</a><a href="#how">이용 방법</a><a href="#prototype">흐름 시연</a><a href="#matching">AI 맞춤 매칭</a><a href="#worker-information">사업 확장</a></nav>
    <div class="header-actions"><a class="text-link" href="#for-worker">일자리 찾기</a><a class="button small" href="#start">인재 찾기 ${icon('arrow', 17)}</a></div>
    <button class="menu-button" type="button" aria-label="메뉴 열기" aria-expanded="false">${icon('menu', 24)}</button>
  </header>
  <div class="mobile-menu" aria-hidden="true"><a href="#start">회원 시작</a><a href="#top">서비스 소개</a><a href="#how">이용 방법</a><a href="#prototype">흐름 시연</a><a href="#matching">AI 맞춤 매칭</a><a href="#worker-information">사업 확장</a></div>

  <main id="main">
    <section class="start-section first-screen" id="start"><span class="brand-mark large">ㄱ</span><h2>실제 근무조건과<br>통근 여건을 비교하세요.</h2><p class="start-intro">고용주는 근무시간·임금·업무 내용을 등록하고, 근로자는 희망조건과 통근 여건을 확인한 뒤 면접을 요청할 수 있습니다.</p><div class="service-overview" aria-label="서비스 이용 흐름"><span><b>고용주</b> 실제 근무조건 등록</span><span><b>근로자</b> 공고·통근 여건 확인</span><span>면접 일정 확인</span></div><p class="start-action-label">회원 유형을 선택해 가입을 시작하세요.</p><div class="start-choices"><button class="button lime" data-start="employer">고용주 회원가입 ${icon('arrow', 18)}</button><button class="button ghost" data-start="worker">근로자 회원가입</button><a class="button login-link" href="#member">회원 로그인</a><a class="button demo-link" href="#prototype">서비스 직접 시연 ${icon('arrow', 18)}</a></div><div class="service-status-summary" aria-label="서비스 운영 상태"><article><span>웹사이트 공개 상태</span><b>공개 배포 중</b><p>회원가입·로그인과 예약 등록·조회 기능을 이용할 수 있습니다.</p></article><article><span>정식 매칭 운영 상태</span><b>운영 전 준비 단계</b><p>공고·지원·직접 연락은 개발 검증 중이며 AI 추천 계산은 연결되지 않았습니다.</p></article></div></section>

    <section class="member-page" id="member"><div class="member-page-heading"><h2>로그인·회원가입</h2><p>회원가입과 로그인, 회원 유형별 예약과 준비 기능을 이 페이지에서 이용할 수 있습니다.</p></div><div id="member-app" class="member-app" aria-live="polite"></div></section>

    <section class="hero" id="top">
      <img class="hero-photo" src="/hero-workplace.png" alt="물류 현장에서 함께 일하는 고용주와 근로자" />
      <div class="hero-shade"></div>
      <div class="hero-content">
        <h1>사람을 찾는 일,<br><em>감이 아닌 근거로.</em></h1>
        <p class="hero-copy">이 웹사이트는 공개 배포되어 있습니다. 회원가입·로그인과 예약은 실제 저장되며, 정식 매칭 서비스에 포함될 공고·지원·직접 연락 기능은 아직 개발 검증 단계입니다.</p>
        <div class="hero-actions"><a class="button lime" href="#start">고용주로 시작하기 ${icon('arrow', 18)}</a><a class="button ghost" href="#for-worker">근로자로 시작하기</a></div>
        <p class="hero-note"><b>정식 매칭 운영 상태</b> · AI 추천 계산 엔진은 아직 연결되지 않았으며, 추천 화면은 시연 예시입니다.</p>
      </div>
      <div class="match-preview" aria-label="추천 인재 시연 예시">
        <em class="demo-badge">${demoDataLabel}</em>
        <div class="preview-top"><span>${icon('spark', 17)} 추천 인재 예시</span><small>AI 개발 예정</small></div>
        <div class="person"><span class="avatar">${demoRecommendation.initials}</span><div><strong>${demoRecommendation.name}</strong><small>${demoRecommendation.role}</small></div><i>예시</i></div>
        <div class="factors">${demoRecommendation.factors.map((factor) => `<span><b>${factor.value}</b>${factor.label}</span>`).join('')}</div>
        <p><span></span> ${demoRecommendation.reason}</p>
      </div>
    </section>

    <section class="signal-strip" id="targets" aria-label="시제품 참여 목표"><p><em class="demo-badge dark">목표 수치</em>시제품 참여 목표이며<br><strong>실제 이용 실적이 아닙니다.</strong></p>${prototypeTargetStats.map((stat) => `<div><strong>${stat.value}</strong><span>${stat.label}</span></div>`).join('')}</section>
    <section class="section intro" id="how">
      <div class="section-heading"><h2>공고부터 첫 출근까지,<br>흐름은 더 단순하게.</h2><p>필요한 조건을 입력하면 추천 근거가 정리됩니다. 제안과 응답, 채용 상태까지 한곳에서 이어집니다.</p></div>
      <div class="steps"><article><span>01</span><i>${icon('briefcase', 26)}</i><h3>조건 입력</h3><p>직무, 지역, 임금과 근무 시간을 입력하는 화면입니다.</p></article><article><span>02</span><i>${icon('spark', 26)}</i><h3>추천 근거 확인</h3><p>현재는 실제 계산이 아닌 시연용 예시를 보여줍니다.</p></article><article><span>03</span><i>${icon('route', 26)}</i><h3>면접 제안</h3><p>면접 일정과 장소를 확인하는 흐름을 시연합니다.</p></article><article><span>04</span><i>${icon('check', 26)}</i><h3>채용 결정</h3><p>자동 결정 없이 고용주가 최종 상태를 선택합니다.</p></article></div>
    </section>

    <section class="section prototype-section" id="prototype">
      <div class="section-heading"><h2>입력부터 결정까지,<br>직접 순서대로 시연하세요.</h2><p>조건 입력부터 추천 근거·면접 제안·채용 결정까지 직접 체험할 수 있습니다. 시연 DB는 실제 고객 및 이용 실적과 분리되며, 체험 중 입력값은 저장되지 않습니다.</p></div>
      <div class="prototype-shell"><nav id="prototype-steps" class="prototype-steps" aria-label="시연 단계"></nav><div id="prototype-panel" class="prototype-panel" aria-live="polite"></div></div>
    </section>

    ${employmentSection()}
    ${workerInformationSection()}
    ${matchingSection()}

    <section class="section dual-audience" id="audiences">
      <div class="audience-grid"><article><span class="audience-no">고용주</span><h2>필요한 조건을<br>직접 등록하세요.</h2><p>회원가입과 예약은 실제 저장됩니다. 공고 등록·지원자 조회는 신고 확인 전 개발 검증 모드에서 준비되어 있습니다.</p><ul><li>실제 동작: 회원·예약</li><li>개발 검증: 공고·지원자</li><li>시연 화면: 추천·채용 결정</li></ul><a href="#start">고용주로 시작하기 ${icon('arrow', 18)}</a></article><article id="for-worker"><span class="audience-no">근로자</span><h2>근무조건을 보고<br>직접 지원하세요.</h2><p>회원가입과 예약은 실제 저장됩니다. 공고 확인·직접 지원은 신고 확인 전 개발 검증 모드에서 준비되어 있습니다.</p><ul><li>실제 동작: 회원·예약</li><li>개발 검증: 공고·직접 지원</li><li>시연 화면: 추천·면접 흐름</li></ul><a href="#start">근로자로 시작하기 ${icon('arrow', 18)}</a></article></div>
    </section>

    ${visaSection()}

    <section class="section trust" id="trust"><div class="section-heading"><h2>더 공정한 연결을 위한<br>그곳잡의 원칙.</h2><p>채용의 속도만큼 정보의 안전과 기능 상태의 투명성을 중요하게 생각합니다.</p></div><div class="trust-grid"><article><b>01</b><h3>민감 정보는 최소한으로</h3><p>채용에 필요한 범위 안에서만 정보를 저장하고 보여줍니다.</p></article><article><b>02</b><h3>추천과 결정은 분리해서</h3><p>추천 예시는 자동 채용을 하지 않으며 실제 계산값처럼 표시하지 않습니다.</p></article><article><b>03</b><h3>실제와 시연은 분리해서</h3><p>가상 인원과 가상 이용 내역에는 시연용 가상 데이터 표시를 붙입니다.</p></article></div></section>

    <section class="policy-document" id="privacy-policy" aria-labelledby="privacy-title"><article><a class="policy-close" href="#trust">안내 닫기</a><p class="policy-state">운영 전 안내 초안 · 법률 검토 필요</p><h2 id="privacy-title">개인정보 처리방침</h2><p>그곳잡은 회원가입·로그인, 회원 유형별 서비스 제공과 예약 관리를 위해 필요한 범위의 개인정보를 처리합니다. 아래 내용은 현재 구현을 기준으로 작성한 안내 초안이며, 사업자 정보와 보유기간 등 미확정 항목은 운영 전 확정·고지해야 합니다.</p><h3>현재 처리하는 정보</h3><ul><li>회원가입: 이름, 이메일, 암호화되어 관리되는 인증 정보, 회원 유형</li><li>회원 기능: 고용주 또는 근로자가 직접 입력한 프로필·근무조건·희망조건</li><li>예약 기능: 예약 종류, 일시, 장소와 메모</li></ul><h3>이용 목적과 보관</h3><p>입력 정보는 계정 인증, 회원 기능 제공, 예약 저장·조회에 사용됩니다. 인증과 데이터 저장에는 Supabase가 사용됩니다. 구체적인 보유·파기 기간, 개인정보 처리자 정보, 문의 연락처와 국외 이전 관련 고지는 운영 전 법률 검토를 거쳐 확정해야 합니다.</p><h3>선택적 위치정보 저장과 거리 결과 공유</h3><p>로그인한 회원이 별도로 동의하고 버튼을 누르면 기기의 현재 위치 권한을 요청해 본인 전용 기본 위치를 저장합니다. 이 기본 위치의 정확한 좌표는 다른 회원에게 공개하지 않으며, 특정 채용 건의 거리 계산이나 공유에도 자동으로 사용하지 않습니다. 채용 건에서 별도로 동의하면 사업장 또는 통근 출발 위치를 직선거리 계산에 사용하고, 해당 건의 당사자와 운영자에게 거리와 기준 범위 결과만 제공합니다. 마지막 저장·동의부터 90일 후 조회·공유를 차단하며 1분 주기의 정리 작업으로 운영 DB에서 삭제합니다. 해당 화면에서 동의를 철회하면 해당 위치를 즉시 삭제합니다. 위치 제공을 거부해도 회원가입·로그인은 가능합니다. 백업 보관·국외 이전 등 전체 개인정보 처리방침은 별도 운영 검토가 필요합니다.</p><h3>시연 데이터</h3><p>‘시연용 가상 데이터’로 표시된 정보는 실제 회원·이용 실적과 분리되며, 실제 고객의 신원 정보로 표시하지 않습니다.</p></article></section>

    <section class="policy-document" id="terms-of-use" aria-labelledby="terms-title"><article><a class="policy-close" href="#trust">안내 닫기</a><p class="policy-state">운영 전 안내 초안 · 법률 검토 필요</p><h2 id="terms-title">이용약관</h2><p>그곳잡은 고용주가 근무조건을 등록하고 근로자가 이를 확인하는 서비스 흐름을 준비하고 있습니다. 현재 공개 사이트에서 실제 연결된 기능과 개발·시연 기능을 구분해 안내합니다.</p><h3>서비스 이용 원칙</h3><ul><li>회원은 본인의 정확한 정보를 입력하고 계정 정보를 안전하게 관리해야 합니다.</li><li>근로계약은 고용주와 근로자가 직접 체결하며, 근무 지시와 임금 지급도 당사자 사이에서 이루어집니다.</li><li>AI 추천 점수와 시연 후보는 예시이며 자동 채용·자동 탈락을 결정하지 않습니다.</li><li>사업 등록과 운영 기준이 확인되기 전에는 실제 소개 및 고객 청구 기능을 운영하지 않습니다.</li></ul><h3>운영 전 확정이 필요한 사항</h3><p>서비스 운영자 정보, 이용 제한·분쟁 처리 기준, 손해배상과 면책 범위, 약관 시행일은 관련 사업 등록과 법률 검토 후 확정해야 합니다.</p></article></section>

    ${pointsSection()}

    <footer id="site-info"><a class="brand" href="#start"><span class="brand-mark">ㄱ</span><b>그곳잡</b></a><p>현장에 맞는 사람과 일을, 근거로 연결합니다.</p><div><a href="#privacy-policy">개인정보 처리방침</a><a href="#terms-of-use">이용약관</a><a href="#points-policy">포인트 정책</a></div><small>© 2026 그곳잡. All rights reserved.</small></footer>
  </main>
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

const navigableScreens = [...document.querySelectorAll('main > section, main > footer')];

function screenIndexFor(element) {
  const screen = element.closest('main > section, main > footer');
  return navigableScreens.indexOf(screen);
}

function currentScreenIndex() {
  const viewportMiddle = window.innerWidth / 2;
  return navigableScreens.reduce((closest, screen, index) => {
    if (getComputedStyle(screen).display === 'none') return closest;
    const bounds = screen.getBoundingClientRect();
    const distance = Math.abs(bounds.left + (bounds.width / 2) - viewportMiddle);
    return distance < closest.distance ? { index, distance } : closest;
  }, { index: 0, distance: Number.POSITIVE_INFINITY }).index;
}

function commitHashNavigation(target, hash) {
  const scroller = document.querySelector('#main');
  const previousScrollBehavior = scroller.style.scrollBehavior;
  scroller.style.scrollBehavior = 'auto';
  document.querySelectorAll('.policy-document').forEach((documentSection) => {
    documentSection.classList.toggle('policy-open', documentSection === target);
  });
  // In-page menus replace the current location, not the user's browser history.
  if (window.location.hash !== hash) window.history.replaceState(null, '', hash);
  target.scrollIntoView({ block: 'start', inline: 'start' });
  window.requestAnimationFrame(() => { scroller.style.scrollBehavior = previousScrollBehavior; });
}

function syncPolicyDocumentFromHash() {
  document.querySelectorAll('.policy-document').forEach((documentSection) => {
    documentSection.classList.toggle('policy-open', `#${documentSection.id}` === window.location.hash);
  });
}

window.addEventListener('popstate', syncPolicyDocumentFromHash);

// Keep the selected page aligned when a phone rotates or the window changes width.
// Height-only changes (such as opening the keyboard) must not reset the current form.
let navigationViewportWidth = window.innerWidth;
let resizeNavigationFrame;
window.addEventListener('resize', () => {
  if (window.innerWidth === navigationViewportWidth) return;
  navigationViewportWidth = window.innerWidth;
  window.cancelAnimationFrame(resizeNavigationFrame);
  resizeNavigationFrame = window.requestAnimationFrame(() => {
    const hash = window.location.hash || '#start';
    const target = document.getElementById(hash.slice(1));
    if (target && screenIndexFor(target) >= 0) commitHashNavigation(target, hash);
  });
});

function navigateSideways(target, hash) {
  const root = document.documentElement;
  const targetScreenIndex = screenIndexFor(target);
  const sourceScreenIndex = currentScreenIndex();
  const forward = targetScreenIndex >= sourceScreenIndex;
  const direction = forward ? 'forward' : 'backward';
  const update = () => commitHashNavigation(target, hash);

  // Mobile menus navigate immediately; desktop keeps the requested side transition.
  if (window.matchMedia('(max-width:1000px), (prefers-reduced-motion:reduce)').matches || targetScreenIndex === sourceScreenIndex) {
    update();
    return;
  }

  root.dataset.navigationDirection = direction;
  root.dataset.lastNavigationDirection = direction;

  if (typeof document.startViewTransition === 'function') {
    const transition = document.startViewTransition(update);
    transition.finished.finally(() => { delete root.dataset.navigationDirection; });
    return;
  }

  const outgoingX = forward ? '-18vw' : '18vw';
  const incomingX = forward ? '18vw' : '-18vw';
  app.animate([{ opacity: 1, transform: 'translateX(0)' }, { opacity: 0, transform: `translateX(${outgoingX})` }], { duration: 180, easing: 'ease-in', fill: 'forwards' }).finished.then(() => {
    update();
    return app.animate([{ opacity: 0, transform: `translateX(${incomingX})` }, { opacity: 1, transform: 'translateX(0)' }], { duration: 240, easing: 'ease-out', fill: 'both' }).finished;
  }).finally(() => { delete root.dataset.navigationDirection; });
}

document.addEventListener('click', (event) => {
  const link = event.target.closest('a[href^="#"]');
  if (!link || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
  const hash = link.getAttribute('href');
  if (!hash || hash === '#') return;
  const target = document.querySelector(hash);
  if (!target) return;
  event.preventDefault();
  navigateSideways(target, hash);
});

const memberApp = document.querySelector('#member-app');
let authMode = 'signup';
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

const prototypeLabels = ['조건 입력', '추천 근거', '면접 제안', '채용 결정'];
let prototypeStep = 0;
let prototypeDecision = '';
let prototypeDemoData = null;
let prototypeCondition = { employer: '', job: '생산·포장', city: '안산시', wage: '12,000원', hours: '09:00~18:00' };

function renderPrototypeFlow() {
  const stepNav = document.querySelector('#prototype-steps');
  const panel = document.querySelector('#prototype-panel');
  if (!stepNav || !panel) return;
  const demoEmployer = prototypeDemoData?.employers?.find((item) => item.demo_code === prototypeCondition.employer) || prototypeDemoData?.employers?.[0];
  const demoWorker = prototypeDemoData?.workers?.[0];
  const demoCountText = prototypeDemoData ? `시연 DB: 음식점 ${prototypeDemoData.employerCount}곳 · 근로자 ${prototypeDemoData.workerCount}명` : '시연 DB를 불러오는 중입니다.';
  stepNav.innerHTML = prototypeLabels.map((label, index) => `<button type="button" class="${prototypeStep === index ? 'active' : ''}" data-prototype-step="${index}"><span>0${index + 1}</span>${label}</button>`).join('');

  if (prototypeStep === 0) {
    const employerOptions = prototypeDemoData?.employers?.map((item) => `<option value="${escapeHtml(item.demo_code)}" ${item.demo_code === demoEmployer?.demo_code ? 'selected' : ''}>${escapeHtml(item.display_name)} · ${escapeHtml(item.city)}</option>`).join('') || '<option value="">시연 음식점 불러오는 중</option>';
    panel.innerHTML = `<div class="prototype-copy"><span class="demo-badge">시연용 가상 데이터 · 실제 고객 아님</span><h3>원하는 근무조건을 입력하세요.</h3><p>실제 서비스와 같은 형태의 별도 시연 DB를 사용합니다. 가상 레코드는 목표 달성이나 실제 이용 실적의 근거가 아닙니다.</p><strong class="prototype-db-status">${escapeHtml(demoCountText)}</strong></div><form id="prototype-condition-form" class="prototype-form"><label>시연 음식점<select name="employer">${employerOptions}</select></label><label>직종<input name="job" required value="${escapeHtml(prototypeCondition.job)}"></label><label>지역<input name="city" required value="${escapeHtml(prototypeCondition.city)}"></label><label>희망 임금<input name="wage" required value="${escapeHtml(prototypeCondition.wage)}"></label><label>근무 시간<input name="hours" required value="${escapeHtml(prototypeCondition.hours)}"></label><button class="button lime" type="submit">추천 근거 예시 보기 ${icon('arrow', 17)}</button></form>`;
  } else if (prototypeStep === 1) {
    const workerName = demoWorker?.display_name || demoRecommendation.name;
    panel.innerHTML = `<div class="prototype-copy"><span class="demo-badge">${demoDataLabel} · 실제 계산 아님</span><h3>${escapeHtml(demoEmployer?.display_name || '시연 음식점')} 추천 예시</h3><p>${escapeHtml(prototypeCondition.city)} ${escapeHtml(prototypeCondition.job)} 조건을 화면에 반영한 시연입니다. 추천 엔진이나 실제 고객 평가에서 계산한 결과가 아닙니다.</p></div><div class="prototype-result"><div class="prototype-person"><span class="avatar">${escapeHtml(workerName.slice(0, 1))}</span><div><b>${escapeHtml(workerName)}</b><small>${escapeHtml(demoWorker?.demo_code || 'DEMO-W-001')} · 시연 후보자</small></div><strong class="unscored-label">점수 미산출 <em>AI 개발 예정</em></strong></div><ul>${demoRecommendation.factors.map((factor) => `<li><span>${factor.label}</span><b>${factor.value}</b></li>`).join('')}</ul><p>${demoRecommendation.reason}</p><button class="button lime" type="button" data-next-prototype="2">면접 제안 화면 보기 ${icon('arrow', 17)}</button></div>`;
  } else if (prototypeStep === 2) {
    panel.innerHTML = `<div class="prototype-copy"><span class="demo-badge">${demoDataLabel}</span><h3>면접 일정을 확인합니다.</h3><p>실제 예약 기능은 로그인 후 이용할 수 있습니다. 이 카드는 면접 제안 흐름만 보여주는 가상 내역입니다.</p></div><div class="prototype-result interview-example"><small>${demoInterview.status}</small><h4>${demoRecommendation.name} · ${escapeHtml(prototypeCondition.job)}</h4><dl><div><dt>일시</dt><dd>${demoInterview.when}</dd></div><div><dt>장소</dt><dd>${demoInterview.location}</dd></div><div><dt>상태</dt><dd>응답 대기 · 예시</dd></div></dl><button class="button lime" type="button" data-next-prototype="3">채용 결정 화면 보기 ${icon('arrow', 17)}</button></div>`;
  } else {
    panel.innerHTML = `<div class="prototype-copy"><span class="demo-badge">${demoDataLabel}</span><h3>고용주가 최종 결정을 선택합니다.</h3><p>AI가 자동으로 채용하거나 탈락시키지 않습니다. 아래 선택은 저장되지 않는 화면 시연입니다.</p></div><div class="prototype-result decision-example"><div><b>${escapeHtml(demoWorker?.display_name || demoRecommendation.name)}</b><span>${escapeHtml(prototypeCondition.job)} · 면접 완료 예시</span></div><div class="decision-actions"><button class="button lime" type="button" data-demo-decision="채용 결정 예시를 선택했습니다.">채용 결정 예시</button><button class="button" type="button" data-demo-decision="보류 예시를 선택했습니다.">보류 예시</button></div><p id="prototype-decision" class="form-status success">${escapeHtml(prototypeDecision)}</p><button class="prototype-restart" type="button" data-restart-prototype>처음부터 다시 시연</button></div>`;
  }

  stepNav.querySelectorAll('[data-prototype-step]').forEach((button) => button.addEventListener('click', () => {
    prototypeStep = Number(button.dataset.prototypeStep);
    renderPrototypeFlow();
  }));
  panel.querySelector('#prototype-condition-form')?.addEventListener('submit', (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    prototypeCondition = {
      employer: formText(form, 'employer'),
      job: formText(form, 'job'), city: formText(form, 'city'),
      wage: formText(form, 'wage'), hours: formText(form, 'hours')
    };
    prototypeStep = 1;
    renderPrototypeFlow();
  });
  panel.querySelector('[data-next-prototype]')?.addEventListener('click', (event) => {
    prototypeStep = Number(event.currentTarget.dataset.nextPrototype);
    renderPrototypeFlow();
  });
  panel.querySelectorAll('[data-demo-decision]').forEach((button) => button.addEventListener('click', () => {
    prototypeDecision = button.dataset.demoDecision;
    panel.querySelector('#prototype-decision').textContent = `${prototypeDecision} DB에는 저장하지 않았습니다.`;
  }));
  panel.querySelector('[data-restart-prototype]')?.addEventListener('click', () => {
    prototypeStep = 0;
    prototypeDecision = '';
    renderPrototypeFlow();
  });
}

renderPrototypeFlow();
loadDemoRecords().then((data) => {
  prototypeDemoData = data;
  if (!prototypeCondition.employer) prototypeCondition.employer = data?.employers?.[0]?.demo_code || '';
  renderPrototypeFlow();
}).catch(() => {
  prototypeDemoData = null;
  renderPrototypeFlow();
});

initExpansionExperience({ client: supabase, loadSnapshot: () => loadExpansionSnapshot(supabase), loadDemo: loadDemoRecords });
initEmploymentUI({ client: supabase, api: createEmploymentApi(supabase, loadClosedBetaConsole), loadDemo: loadDemoRecords, createManual: createManualIntroduction, saveContract: saveContractConfirmation, saveWage: saveWagePaymentResponse, assessCommute: async (id, threshold) => {
  const { data, error } = await supabase.rpc('assess_introduction_commute', { p_id:id, p_threshold:threshold });
  if (error) throw error;
  return data;
} });

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

function oneRelation(value) {
  return Array.isArray(value) ? value[0] : value;
}

function closedBetaConsole(data) {
  const activeIds = new Set(data.participants.filter((item) => item.active).map((item) => item.profile_id));
  const profileOptions = data.profiles
    .map((item) => `<option value="${item.id}" data-role="${item.role}">${escapeHtml(item.full_name || '이름 미입력')} · ${item.role === 'employer' ? '고용주' : '근로자'}</option>`)
    .join('');
  const jobs = data.jobs.filter((job) => activeIds.has(oneRelation(job.employer)?.profile_id));
  const workers = data.workers.filter((worker) => activeIds.has(worker.profile_id));
  const jobOptions = jobs.map((job) => `<option value="${job.id}">${escapeHtml(job.company_name || oneRelation(job.employer)?.company_name || '사업장')} · ${escapeHtml(job.title)}</option>`).join('');
  const workerOptions = workers.map((worker) => `<option value="${worker.id}">${escapeHtml(oneRelation(worker.profile)?.full_name || '이름 미입력')} · ${escapeHtml(worker.job_category)}</option>`).join('');
  const jobsById = new Map(data.jobs.map((item) => [item.id, item]));
  const workersById = new Map(data.workers.map((item) => [item.id, item]));

  const introductionCards = data.introductions.map((item) => {
    const job = jobsById.get(item.job_posting_id) ?? {};
    const worker = workersById.get(item.worker_id) ?? {};
    const contract = oneRelation(item.contract);
    const payment = oneRelation(item.payment);
    const outcome = oneRelation(item.outcome);
    const payerProfileId = oneRelation(job.employer)?.profile_id || '';
    const contractConfirmed = contract?.status === 'confirmed';
    return `<article class="beta-record">
      <div class="beta-record-head"><div><span>수동 소개 기록</span><h4>${escapeHtml(job.title || '공고')} ↔ ${escapeHtml(oneRelation(worker.profile)?.full_name || '근로자')}</h4></div><b>${escapeHtml(item.status)}</b></div>
      <p><strong>비교 메모</strong>${escapeHtml(item.comparison_notes)}</p><p><strong>선택 근거</strong>${escapeHtml(item.selection_reason || '미입력')}</p>${item.employer_feedback ? `<p><strong>고용주 의견</strong>${escapeHtml(item.employer_feedback)}</p>` : ''}
      <div class="beta-stage-grid">
        <form class="beta-contract-form" data-introduction-id="${item.id}"><h5>1. 계약 자료 검토</h5><a href="#work-management">전자계약 체결 완료 확인 →</a><p>완료 상태는 검증된 체결 근거로만 변경됩니다.</p><label>상태<select name="status"><option value="pending" ${contract?.status === 'pending' || !contract ? 'selected' : ''}>확인 대기</option><option value="submitted" ${contract?.status === 'submitted' ? 'selected' : ''}>확인자료 접수</option><option value="rejected" ${contract?.status === 'rejected' ? 'selected' : ''}>확인 반려</option></select></label><label>확인 방법·근거<input name="confirmation_method" value="${escapeHtml(contract?.confirmation_method || '')}" placeholder="기준 확정 후 직접 입력"></label><label>증빙 참조 메모<input name="evidence_reference" value="${escapeHtml(contract?.evidence_reference || '')}"></label><button class="button" type="submit" ${contractConfirmed ? 'disabled' : ''}>자료 검토 상태 저장</button><p class="form-status" role="status"></p></form>
        <form class="beta-payment-form" data-introduction-id="${item.id}" data-payer-profile-id="${payerProfileId}"><h5>2. 결제 준비·테스트</h5><p>19,000원 · 임시 검증 가격<br>결제 제공자 미연결 · 실제 청구 없음</p><div class="payment-gate ${contractConfirmed ? 'eligible' : 'blocked'}">${contractConfirmed ? '계약 확인됨 · 테스트 가능' : '계약 확인 전 · 결제 차단'}</div><button class="button" type="submit" name="charge_status" value="blocked">테스트 결제수단·동의 기록</button><button class="button lime" type="submit" name="charge_status" value="test_completed" ${contractConfirmed ? '' : 'disabled'}>무청구 결제 흐름 완료</button><small>현재 상태: ${escapeHtml(payment?.charge_status || 'blocked')}</small><p class="form-status" role="status"></p></form>
        <form class="beta-outcome-form" data-introduction-id="${item.id}"><h5>3. 근무 결과</h5><label>출근 여부<select name="attendance_status"><option value="unknown">미확인</option><option value="attended" ${outcome?.attendance_status === 'attended' ? 'selected' : ''}>출근</option><option value="no_show" ${outcome?.attendance_status === 'no_show' ? 'selected' : ''}>미출근</option></select></label><label>첫 근무<select name="first_shift_status"><option value="unknown">미확인</option><option value="completed" ${outcome?.first_shift_status === 'completed' ? 'selected' : ''}>완료</option><option value="not_completed" ${outcome?.first_shift_status === 'not_completed' ? 'selected' : ''}>미완료</option></select></label><label>계약기간 결과<select name="contract_outcome"><option value="unknown">미확인</option><option value="in_progress" ${outcome?.contract_outcome === 'in_progress' ? 'selected' : ''}>이행 중</option><option value="completed" ${outcome?.contract_outcome === 'completed' ? 'selected' : ''}>계약기간 완료</option><option value="ended_early" ${outcome?.contract_outcome === 'ended_early' ? 'selected' : ''}>중도 종료</option></select></label><label>결과 메모<textarea name="outcome_notes" rows="2">${escapeHtml(outcome?.outcome_notes || '')}</textarea></label><button class="button" type="submit">근무 결과 저장</button><p class="form-status" role="status"></p></form>
      </div>
    </article>`;
  }).join('');

  return `<section class="closed-beta-console">
    <div class="compliance-banner"><b>시제품 1 · 관리자 수동 매칭 개발 모드</b><p>유료직업소개사업 등록과 결제 연동은 확인되지 않았습니다. 실제 소개·청구 없이 제한 참여자 데이터로만 검증합니다.</p></div>
    <div class="beta-admin-grid">
      <form id="beta-participant-form" class="mvp-card mvp-form"><div class="card-title"><span>참여자 제한</span><h3>클로즈 베타 참여자 지정</h3></div><label>회원<select name="profile_id" required><option value="">선택하세요</option>${profileOptions}</select></label><button class="button" type="submit">참여자로 지정</button><p class="form-status" role="status"></p></form>
      <form id="manual-introduction-form" class="mvp-card mvp-form"><div class="card-title"><span>운영자 수동 비교</span><h3>공고와 근로자 비교·선택</h3><p>자동 점수 없이 실제 근무조건과 경력·희망조건·통근 여건을 직접 확인합니다.</p></div><label>공고<select name="job_posting_id" required><option value="">${jobs.length ? '공고 선택' : '참여 고용주의 공고가 없습니다'}</option>${jobOptions}</select></label><label>근로자<select name="worker_id" required><option value="">${workers.length ? '근로자 선택' : '참여 근로자 정보가 없습니다'}</option>${workerOptions}</select></label><label>고용주 의견<textarea name="employer_feedback" rows="2" maxlength="2000"></textarea></label><label>비교 메모<textarea name="comparison_notes" rows="3" maxlength="3000" required placeholder="근무조건, 유사업무 경험, 희망조건, 통근 여건을 직접 비교한 내용"></textarea></label><label>선택 근거<textarea name="selection_reason" rows="2" maxlength="2000" required></textarea></label><button class="button lime" type="submit" ${jobs.length && workers.length ? '' : 'disabled'}>수동 소개 기록</button><p class="form-status" role="status"></p></form>
    </div>
    <div class="beta-comparison"><div><h4>고용주 근무조건</h4>${jobs.length ? jobs.map((job) => `<article><b>${escapeHtml(job.title)}</b><p>${escapeHtml(job.city)} · ${escapeHtml(job.workplace_address || '주소 미입력')}<br>${escapeHtml(job.work_days || '근무일 미입력')} · ${escapeHtml(job.work_hours || '근무시간 미입력')}<br>${Number(job.wage_amount || 0).toLocaleString()}원 (${escapeHtml(job.wage_type)})</p></article>`).join('') : '<p>비교할 공고가 없습니다.</p>'}</div><div><h4>근로자 조건</h4>${workers.length ? workers.map((worker) => `<article><b>${escapeHtml(oneRelation(worker.profile)?.full_name || '이름 미입력')}</b><p>${escapeHtml(worker.job_category)} · 경력 ${Number(worker.experience_months || 0)}개월<br>${escapeHtml(worker.city)} · ${escapeHtml(worker.desired_conditions || '희망조건 미입력')}<br>${escapeHtml(worker.experience_summary || '경력요약 미입력')}</p></article>`).join('') : '<p>비교할 근로자가 없습니다.</p>'}</div></div>
    <div class="beta-records"><div class="list-head"><span>소개·계약·결제·근무 기록</span><b>${data.introductions.length}건</b></div>${introductionCards || '<p class="empty-state">아직 수동 소개 기록이 없습니다.</p>'}</div>
    <p class="beta-criteria-note">계약 확인 방법과 계약기간 이행률 계산 기준은 확정되지 않았습니다. 확인 근거는 운영자가 직접 기록하며, 이행률 수치는 계산하지 않습니다.</p>
  </section>`;
}

function openBetaAdminConsole(data) {
  const readiness = data.readiness || {};
  const introductions = data.introductions || [];
  const introOptions = introductions.map((item) => `<option value="${item.id}">${escapeHtml(item.id.slice(0, 8))} · ${escapeHtml(item.status)}</option>`).join('');
  const paidRecords = data.feePayments.filter((item) => item.status === 'paid');
  const paidTotal = paidRecords.reduce((sum, item) => sum + Number(item.amount_krw || 0), 0);
  const costTotal = data.operatingCosts.reduce((sum, item) => sum + Number(item.amount_krw || 0), 0);
  const reuseDecided = data.reuseIntentions.filter((item) => item.response !== 'undecided');
  const commuteByIntro = new Map(data.commutes.map((item) => [item.introduction_id, item]));
  const commuteRows = introductions.map((item) => {
    const commute = commuteByIntro.get(item.id);
    const result = commute?.status === 'calculated' || commute?.status === 'manual_verified'
      ? `직선거리 ${Number(commute.distance_km).toLocaleString('ko-KR')}km · ${commute.is_nearby ? '기준 이내' : '기준 밖'} (기준 ${Number(commute.nearby_threshold_km).toLocaleString('ko-KR')}km, 이동거리·통근시간 아님)`
      : '미판별';
    return `<article><b>소개 ${escapeHtml(item.id.slice(0, 8))}</b><p>${escapeHtml(result)}</p><button class="button open-beta-distance" data-introduction-id="${item.id}" type="button">거리 판별 실행</button><p class="form-status" role="status"></p></article>`;
  }).join('');
  const wageRows = data.wageResponses.map((response) => {
    const review = data.wageReviews.find((item) => item.response_id === response.id);
    return `<article><b>${escapeHtml(response.response)}</b><p>근로자 응답 · ${new Date(response.responded_at).toLocaleDateString('ko-KR')}<br>확정 검토: ${escapeHtml(review?.status || '검토 생성 전')}</p></article>`;
  }).join('');
  const accessRows = data.accessControls.map((item) => `<article><b>${escapeHtml(item.status)}</b><p>고용주 ${escapeHtml(item.employer_id.slice(0, 8))} · ${item.decision_basis ? escapeHtml(item.decision_basis) : '결정 근거 미입력'}</p></article>`).join('');
  const criterionRows = data.criteria.map((item) => `<article><b>${escapeHtml(item.criterion_name)}</b><p>${escapeHtml(item.observation)} · ${escapeHtml(item.status)}</p></article>`).join('');

  return `<section class="open-beta-console">
    <div class="compliance-banner"><b>시제품 2 · 오픈 베타 개발 검증</b><p>실제 데이터만 집계합니다. 거리·미지급 확정·이용 제한·실결제는 필요한 기준과 연동이 확인되기 전까지 잠겨 있습니다.</p></div>
    <div class="open-beta-readiness">
      <article><span>거리 판별</span><b>${readiness.commute_method && readiness.nearby_threshold_km ? '설정됨' : '기준 설정 필요'}</b><small>${readiness.commute_method ? escapeHtml(readiness.commute_method) : '계산 방식 미정'} · ${readiness.nearby_threshold_km ? `${Number(readiness.nearby_threshold_km)}km` : '근거리 기준 미정'}</small></article>
      <article><span>미지급 확정</span><b>${readiness.wage_confirmation_policy_configured ? '기준 설정됨' : '기준 설정 필요'}</b><small>근로자 응답과 운영자 확정 기록을 분리</small></article>
      <article><span>이용 제한</span><b>${readiness.employer_restriction_policy_configured ? '정책 설정됨' : '정책 설정 필요'}</b><small>확정 미지급 + 정책 버전 없이는 제한 불가</small></article>
      <article><span>실결제</span><b>${readiness.paid_operations_enabled && readiness.payment_integration_verified ? '연동 확인됨' : '연동 필요'}</b><small>등록 확인·결제 제공자 검증 전 완료 기록 불가</small></article>
    </div>
    <div class="open-beta-stats">
      <article><span>확인된 수수료 결제</span><b>${paidRecords.length ? `${paidRecords.length}건 · ${paidTotal.toLocaleString('ko-KR')}원` : '미집계'}</b></article>
      <article><span>재이용 응답</span><b>${reuseDecided.length ? `${reuseDecided.length}건` : '미집계'}</b></article>
      <article><span>운영비용</span><b>${data.operatingCosts.length ? `${costTotal.toLocaleString('ko-KR')}원` : '미집계'}</b></article>
    </div>
    <div class="beta-comparison"><div><h4>출퇴근 거리 판별</h4>${commuteRows || '<p>판별할 실제 소개 기록이 없습니다.</p>'}</div><div><h4>급여 응답과 검토 상태</h4>${wageRows || '<p>실제 급여 응답이 없어 미집계입니다.</p>'}</div></div>
    <div class="beta-comparison"><div><h4>고용주 이용 상태</h4>${accessRows || '<p>제한 또는 검토 기록이 없습니다.</p>'}</div><div><h4>매칭 기준 관찰 기록</h4>${criterionRows || '<p>누적된 실제 관찰 기록이 없습니다.</p>'}</div></div>
    <div class="beta-admin-grid">
      <form id="matching-criterion-form" class="mvp-card mvp-form"><div class="card-title"><span>실제 근무 결과 근거</span><h3>매칭 기준 관찰 기록</h3><p>점수를 자동 계산하지 않고 고용주 의견과 근무 결과에서 확인한 사실을 기록합니다.</p></div><label>소개 기록<select name="introduction_id" required><option value="">선택하세요</option>${introOptions}</select></label><label>관찰 항목<input name="criterion_name" maxlength="120" required></label><label>관찰 내용<textarea name="observation" maxlength="2000" rows="3" required></textarea></label><label>검토 상태<select name="status"><option value="observed">관찰</option><option value="candidate">기준 후보</option><option value="approved">승인 기준</option></select></label><button class="button" type="submit" ${introductions.length ? '' : 'disabled'}>관찰 기록 저장</button><p class="form-status" role="status"></p></form>
      <form id="operating-cost-form" class="mvp-card mvp-form"><div class="card-title"><span>실제 지출만 기록</span><h3>운영비용 기록</h3></div><label>지출일<input type="date" name="cost_date" required></label><label>항목<input name="category" maxlength="100" required></label><label>금액(원)<input type="number" name="amount_krw" min="1" required></label><label>설명<textarea name="description" maxlength="1000" rows="2"></textarea></label><label>증빙 참조<input name="evidence_reference" maxlength="1000"></label><button class="button" type="submit">실제 비용 기록</button><p class="form-status" role="status"></p></form>
    </div>
    <p class="beta-criteria-note">실제 수수료 결제 기록 테이블은 준비됐지만 사업 등록과 서버 측 결제 제공자·웹훅 검증이 없어 결제 완료 입력은 잠겨 있습니다. 근로자의 미지급 응답은 신고가 아니라 응답 기록이며 자동 제재 근거가 아닙니다.</p>
  </section>`;
}

function openBetaMemberPanel(data, role) {
  const introCards = data.introductions.map((item) => {
    const job = oneRelation(item.job) || {};
    const outcome = oneRelation(item.outcome);
    const commute = oneRelation(item.commute);
    const wage = oneRelation(item.wage);
    const review = oneRelation(wage?.review);
    const ended = ['completed', 'ended_early'].includes(outcome?.contract_outcome);
    const commuteText = commute && ['calculated', 'manual_verified'].includes(commute.status)
      ? `직선거리 ${Number(commute.distance_km).toLocaleString('ko-KR')}km · ${commute.is_nearby ? '기준 이내' : '기준 밖'} (판별 기준 ${Number(commute.nearby_threshold_km).toLocaleString('ko-KR')}km, 이동거리·통근시간 아님)`
      : '아직 판별되지 않음';
    return `<article class="beta-record"><div class="beta-record-head"><div><span>실제 소개 기록</span><h4>${escapeHtml(job.company_name || '사업장')} · ${escapeHtml(job.title || '공고')}</h4></div><b>${escapeHtml(item.status)}</b></div><p><strong>출퇴근 거리</strong>${escapeHtml(commuteText)}</p><p><strong>근무 결과</strong>${escapeHtml(outcome?.contract_outcome || '미확인')}</p>${role === 'worker' ? `<form class="wage-response-form" data-introduction-id="${item.id}" data-worker-id="${item.worker_id}"><h5>근무 종료 후 급여 지급 여부</h5><label>응답<select name="response" required><option value="">선택하세요</option><option value="paid" ${wage?.response === 'paid' ? 'selected' : ''}>지급받음</option><option value="not_paid" ${wage?.response === 'not_paid' ? 'selected' : ''}>아직 지급받지 못함</option></select></label><label>메모<textarea name="response_note" maxlength="2000" rows="2">${escapeHtml(wage?.response_note || '')}</textarea></label><button class="button" type="submit" ${ended ? '' : 'disabled'}>${wage ? '응답 수정' : '응답 저장'}</button><small>${ended ? `운영자 검토 상태: ${escapeHtml(review?.status || '검토 생성 전')}` : '근무 종료 결과가 기록된 뒤 응답할 수 있습니다.'}</small><p class="form-status" role="status"></p></form>` : ''}</article>`;
  }).join('');
  return `<section class="open-beta-console"><div class="compliance-banner"><b>시제품 2 · 실제 기록 영역</b><p>표시된 거리와 상태는 Supabase에 저장된 실제 기록만 사용합니다. 없는 값은 미판별 또는 미확인으로 표시합니다.</p></div><div class="beta-records">${introCards || '<p class="empty-state">연결된 실제 소개 기록이 없습니다.</p>'}</div><form id="reuse-intention-form" class="mvp-card mvp-form"><div class="card-title"><span>서비스 이용 의향</span><h3>재이용 여부 기록</h3></div><label>관련 소개<select name="introduction_id"><option value="">전체 서비스</option>${data.introductions.map((item) => `<option value="${item.id}">${escapeHtml(item.id.slice(0, 8))}</option>`).join('')}</select></label><label>재이용 의향<select name="response"><option value="undecided">미정</option><option value="yes">재이용 의향 있음</option><option value="no">재이용 의향 없음</option></select></label><label>의견<textarea name="response_note" maxlength="1000" rows="2"></textarea></label><button class="button" type="submit">실제 응답 저장</button><p class="form-status" role="status"></p></form></section>`;
}

function serviceLaunchAdminConsole(data) {
  const readiness = data.readiness || {};
  const casesByIntro = new Map(data.serviceCases.map((item) => [item.introduction_id, item]));
  const paidRecords = data.feePayments.filter((item) => item.status === 'paid');
  const reuseRecords = data.reuseIntentions.filter((item) => item.response !== 'undecided');
  const caseRows = data.introductions.map((intro) => {
    const serviceCase = casesByIntro.get(intro.id);
    const events = serviceCase ? data.caseEvents.filter((event) => event.service_case_id === serviceCase.id) : [];
    return `<article class="launch-case"><div><small>소개 ${escapeHtml(intro.id.slice(0, 8))}</small><b>${escapeHtml(serviceCase?.stage || '정식 흐름 미연결')}</b><p>${events.length ? `${events.length}개 단계 이력` : '단계 이력 없음'}</p></div><button type="button" class="button sync-service-case" data-introduction-id="${intro.id}">현재 기록과 동기화</button><p class="form-status" role="status"></p></article>`;
  }).join('');
  return `<section class="service-launch-console">
    <div class="compliance-banner"><b>서비스 런치 준비 · 관리자 개발 검증</b><p>수동 소개 → 계약 확인 → 근무 결과를 하나의 서비스 건과 변경 이력으로 연결합니다. 근로계약·업무 지시·임금 지급의 당사자는 고용주와 근로자이며 플랫폼은 임금을 보관하거나 지급하지 않습니다.</p></div>
    <div class="open-beta-readiness">
      <article><span>사업 등록</span><b>${readiness.paid_operations_enabled ? '확인됨' : '확인 필요'}</b><small>확인 전 production 서비스 건 생성 차단</small></article>
      <article><span>정식 수수료</span><b>${readiness.confirmed_fee_amount_krw ? `${Number(readiness.confirmed_fee_amount_krw).toLocaleString('ko-KR')}원` : '미확정'}</b><small>${readiness.confirmed_fee_policy_version ? escapeHtml(readiness.confirmed_fee_policy_version) : '19,000원은 임시 검증값 유지'}</small></article>
      <article><span>결제 연동</span><b>${readiness.payment_integration_verified ? '검증됨' : '연동 필요'}</b><small>서버 제공자·웹훅 검증 전 paid 저장 차단</small></article>
      <article><span>AI 자동화</span><b>고도화 계획</b><small>데이터 충분성·모델 성능 기준 미정</small></article>
    </div>
    <div class="open-beta-stats"><article><span>정식 흐름 연결</span><b>${data.serviceCases.length ? `${data.serviceCases.length}건` : '미집계'}</b></article><article><span>확인된 실제 결제</span><b>${paidRecords.length ? `${paidRecords.length}건` : '미집계'}</b></article><article><span>재이용 응답</span><b>${reuseRecords.length ? `${reuseRecords.length}건` : '미집계'}</b></article></div>
    <div class="beta-records"><div class="list-head"><span>수동 소개·계약·근무 결과 연결</span><b>${data.introductions.length}건</b></div>${caseRows || '<p class="empty-state">연결할 실제 수동 소개 기록이 없습니다.</p>'}</div>
    <div class="beta-comparison"><div><h4>누적 고용주 의견</h4>${data.employerFeedback.length ? data.employerFeedback.map((item) => `<article><b>${escapeHtml(item.feedback_type)}</b><p>${escapeHtml(item.feedback_text)}<br>${new Date(item.created_at).toLocaleDateString('ko-KR')}</p></article>`).join('') : '<p>실제 고용주 의견이 없어 미집계입니다.</p>'}</div><div><h4>운영 기록</h4><article><b>근무 결과 ${data.introductions.filter((item) => oneRelation(item.outcome)).length}건</b><p>계약기간 이행률은 기준 미정으로 계산하지 않습니다.</p></article><article><b>운영비용 ${data.operatingCosts.length ? `${data.operatingCosts.length}건` : '미집계'}</b><p>실제 입력된 비용만 합산합니다.</p></article></div></div>
    <p class="beta-criteria-note">정식 수수료가 확정되어 금액·정책 버전·확인일이 모두 설정되기 전에는 실제 결제 완료를 기록할 수 없습니다. 19,000원은 기존 무청구 테스트 준비 기록에만 남아 있습니다.</p>
  </section>`;
}

function serviceLaunchMemberPanel(data, role) {
  const casesByIntro = new Map(data.serviceCases.map((item) => [item.introduction_id, item]));
  const outcomeByIntro = new Map(data.introductions.map((item) => [item.id, oneRelation(item.outcome)]));
  const rows = data.introductions.map((intro) => {
    const job = oneRelation(intro.job) || {};
    const serviceCase = casesByIntro.get(intro.id);
    const events = serviceCase ? data.caseEvents.filter((event) => event.service_case_id === serviceCase.id) : [];
    const outcome = outcomeByIntro.get(intro.id);
    return `<article class="beta-record"><div class="beta-record-head"><div><span>직접 체결 서비스 건</span><h4>${escapeHtml(job.company_name || '사업장')} · ${escapeHtml(job.title || '공고')}</h4></div><b>${escapeHtml(serviceCase?.stage || '준비 중')}</b></div><p><strong>단계 이력</strong>${events.length ? events.map((event) => escapeHtml(event.to_stage)).join(' → ') : '아직 없음'}</p><p><strong>근무 결과</strong>${escapeHtml(outcome?.contract_outcome || '미확인')}</p></article>`;
  }).join('');
  const employerForm = role === 'employer' && data.introductions.length ? `<form id="employer-feedback-form" class="mvp-card mvp-form"><div class="card-title"><span>계속 축적되는 실제 기록</span><h3>고용주 의견 추가</h3></div><label>소개 기록<select name="introduction_id" required>${data.introductions.map((item) => `<option value="${item.id}" data-outcome-id="${oneRelation(item.outcome)?.id || ''}">${escapeHtml(item.id.slice(0, 8))}</option>`).join('')}</select></label><label>의견 구분<select name="feedback_type"><option value="introduction">소개</option><option value="contract">계약</option><option value="work_progress">근무 진행</option><option value="contract_completion">계약기간 결과</option><option value="reuse">재이용</option></select></label><label>의견<textarea name="feedback_text" maxlength="2000" rows="3" required></textarea></label><button class="button" type="submit">실제 의견 기록</button><p class="form-status" role="status"></p></form>` : '';
  return `<section class="service-launch-console"><div class="compliance-banner"><b>정식 서비스 흐름 준비</b><p>근로계약은 고용주와 근로자가 직접 체결하고, 근무 지시와 임금 지급은 고용주가 수행합니다. 플랫폼은 임금을 보관하거나 대신 지급하지 않습니다.</p></div><div class="beta-records">${rows || '<p class="empty-state">연결된 실제 서비스 건이 없습니다.</p>'}</div>${employerForm}</section>`;
}

function demoMarketplacePanel(data, role) {
  if (!data) return '<div class="dashboard-warning"><p><b>시연 명단을 불러오지 못했습니다.</b><br>실제 회원 명단으로 대체하지 않았습니다.</p></div>';
  const isEmployer = role === 'employer';
  const records = isEmployer ? data.workers : data.employers;
  const unit = isEmployer ? '명' : '곳';
  const title = isEmployer ? '시연 근로자 전체 명단' : '시연 음식점·업종 전체 명단';
  const recommendationTitle = isEmployer ? '추천 근로자 리스트' : '추천 업종·음식점 리스트';
  const interviewRequests = data.interviewRequests ?? [];
  const statusLabels = { requested: '응답 대기', accepted: '면접 수락', declined: '수락 불가' };
  const interviewRows = interviewRequests.map((item) => {
    const decisionButtons = isEmployer && item.status === 'requested'
      ? `<div class="demo-interview-actions"><button type="button" class="button lime" data-demo-interview-decision="accepted" data-request-id="${escapeHtml(item.id)}">수락</button><button type="button" class="button" data-demo-interview-decision="declined" data-request-id="${escapeHtml(item.id)}">수락 불가</button><p class="form-status" role="status"></p></div>`
      : `<strong class="demo-interview-status ${escapeHtml(item.status)}">${escapeHtml(statusLabels[item.status] || item.status)}</strong>`;
    return `<article><small>${escapeHtml(item.data_label)} · ${escapeHtml(statusLabels[item.status] || item.status)}</small><b>${escapeHtml(item.restaurant_name)} · ${escapeHtml(item.industry)}</b><p>${escapeHtml(item.interview_date)} ${escapeHtml(String(item.interview_time).slice(0, 5))} · ${escapeHtml(item.interview_method)}</p>${decisionButtons}</article>`;
  }).join('');
  const interviewList = `<section class="demo-shared-interviews"><div class="demo-market-head"><div><span>Supabase 시연 예약</span><h3>${isEmployer ? '근로자 면접 요청 리스트' : '내 시연 면접 요청'}</h3><p>실제 회원 연락처 없이 시연 음식점·업종·일정만 공유됩니다.</p></div><button type="button" class="button" data-refresh-demo-interviews>새로고침</button></div><div class="demo-interview-list">${interviewRows || '<p class="empty-state">아직 등록된 시연 면접 요청이 없습니다.</p>'}</div></section>`;
  const card = (item, recommended = false) => {
    const detail = isEmployer
      ? `${item.city} · ${item.job_category} · 가상 경력 ${Number(item.experience_months)}개월`
      : `${item.city} · ${item.industry}`;
    const searchable = `${item.display_name} ${detail} ${item.demo_code}`.toLowerCase();
    return `<button type="button" class="demo-market-card${recommended ? ' recommended' : ''}" ${recommended ? '' : 'data-demo-market-card'} data-demo-interview data-demo-code="${escapeHtml(item.demo_code)}" data-demo-name="${escapeHtml(item.display_name)}" data-demo-detail="${escapeHtml(detail)}" data-demo-industry="${escapeHtml(isEmployer ? item.job_category : item.industry)}" data-searchable="${escapeHtml(searchable)}"><small>${recommended ? '추천 예시 · 실제 계산 아님' : `${escapeHtml(item.data_label)} · ${escapeHtml(item.demo_code)}`}</small><b>${escapeHtml(item.display_name)}</b><p>${escapeHtml(detail)}</p><span>${isEmployer ? '면접 제안 체험' : '면접 요청 예약'} ${icon('arrow', 14)}</span></button>`;
  };
  const recommendations = records.slice(0, 6).map((item) => card(item, true)).join('');
  const cards = records.map((item) => card(item)).join('');
  return `<section class="demo-marketplace">${interviewList}<div class="demo-market-divider"></div><div class="demo-market-head"><div><span>시연 DB · 실제 회원 명단 아님</span><h3>${recommendationTitle}</h3><p>추천 계산이 연결되지 않아 시연 레코드 중 일부를 예시로 표시합니다. 카드를 누르면 면접 흐름을 체험할 수 있습니다.</p></div><b>예시</b></div><div class="demo-market-grid demo-recommend-grid">${recommendations}</div><div class="demo-market-divider"></div><div class="demo-market-head"><div><span>전체 시연 명단</span><h3>${title}</h3><p>목표 달성이나 실제 이용 실적으로 집계되지 않는 가상 인물입니다.</p></div><b>${records.length}${unit}</b></div><label class="demo-market-search">명단 검색<input type="search" data-demo-market-search placeholder="이름, 지역, 업종 검색"></label><div class="demo-market-grid">${cards}</div><p class="demo-market-empty" hidden>검색 결과가 없습니다.</p><section class="demo-interview-panel" data-demo-interview-panel hidden aria-live="polite"></section></section>`;
}

function renderDemoInterview(panel, role, selected) {
  const isEmployer = role === 'employer';
  const actionLabel = isEmployer ? '면접 제안' : '면접 요청';
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  panel.hidden = false;
  const workerNotice = isEmployer ? '실제 상대방에게 전송되거나 예약 DB에 저장되지 않습니다.' : '음식점·업종·일정만 시연 DB에 저장되며 이름·이메일·전화번호는 고용주에게 공유되지 않습니다.';
  panel.innerHTML = `<span>${isEmployer ? '저장되지 않는 면접 제안 시연' : '고용주에게 공유되는 시연 면접 요청'}</span><h3>${escapeHtml(selected.name)} ${actionLabel}</h3><p>${escapeHtml(selected.detail)}</p><form data-demo-interview-form><label>면접 날짜<input type="date" name="date" value="${tomorrow}" required></label><label>면접 시간<input type="time" name="time" value="14:00" required></label><label>면접 방식<select name="method"><option>매장 방문</option><option>전화 면접</option><option>영상 면접</option></select></label><button class="button lime" type="submit">${actionLabel} ${isEmployer ? '시연 완료' : '예약'}</button><p class="form-status" role="status">${workerNotice}</p></form>`;
  panel.querySelector('[data-demo-interview-form]').addEventListener('submit', async (event) => {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const submit = formElement.querySelector('[type="submit"]');
    submit.disabled = true;
    setFormMessage(formElement, isEmployer ? '면접 제안 화면을 처리하는 중입니다…' : '시연 면접 요청을 저장하는 중입니다…');
    try {
      if (!isEmployer) {
        await createDemoInterviewRequest({
          demo_employer_code: selected.code,
          restaurant_name: selected.name,
          industry: selected.industry,
          interview_date: formText(form, 'date'),
          interview_time: formText(form, 'time'),
          interview_method: formText(form, 'method')
        });
      }
      const resultText = isEmployer
        ? '화면 체험만 완료되었습니다. 실제 면접 제안 전송과 DB 저장은 실행하지 않았습니다.'
        : '시연 면접 요청을 저장했습니다. 고용주 계정의 면접 요청 리스트에서 음식점·업종·일정을 확인할 수 있습니다.';
      panel.innerHTML = `<span>면접 ${isEmployer ? '시연' : '요청'} 완료</span><h3>${escapeHtml(selected.name)}</h3><p>${escapeHtml(formText(form, 'date'))} ${escapeHtml(formText(form, 'time'))} · ${escapeHtml(formText(form, 'method'))}</p><div class="demo-interview-result">${resultText}</div><button type="button" class="button" data-demo-interview-close>다른 명단 보기</button>`;
      panel.querySelector('[data-demo-interview-close]').addEventListener('click', () => { panel.hidden = true; });
    } catch (error) {
      setFormMessage(formElement, error.message, 'error');
      submit.disabled = false;
    }
  });
  panel.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

async function renderDashboard(session) {
  memberApp.innerHTML = '<p class="member-loading">회원 정보와 저장된 데이터를 불러오는 중입니다…</p>';
  try {
    const [profileResult, reservationsResult, mvpResult, betaResult, openBetaResult, launchResult, demoMarketResult] = await Promise.allSettled([
      getMyProfile(),
      loadReservations(),
      isJobInfoMvpDevelopment ? getMyProfile().then((profile) => loadMvpData(profile.role)) : Promise.resolve(null),
      isClosedBetaDevelopment ? getMyProfile().then((profile) => profile.role === 'admin' ? loadClosedBetaConsole() : null) : Promise.resolve(null),
      isOpenBetaDevelopment ? getMyProfile().then((profile) => profile.role === 'admin' ? loadOpenBetaConsole() : loadOpenBetaMemberData()) : Promise.resolve(null),
      isServiceLaunchDevelopment ? getMyProfile().then((profile) => profile.role === 'admin' ? loadServiceLaunchConsole() : loadServiceLaunchMemberData()) : Promise.resolve(null),
      loadDemoMarketplace()
    ]);
    const fallbackRole = session.user.user_metadata?.role === 'employer' ? 'employer' : 'worker';
    const profile = profileResult.status === 'fulfilled'
      ? profileResult.value
      : { role: fallbackRole, full_name: session.user.user_metadata?.full_name || '' };
    const reservations = reservationsResult.status === 'fulfilled' ? reservationsResult.value : [];
    const mvpData = mvpResult.status === 'fulfilled' ? mvpResult.value : null;
    const betaData = betaResult.status === 'fulfilled' ? betaResult.value : null;
    const openBetaData = openBetaResult.status === 'fulfilled' ? openBetaResult.value : null;
    const launchData = launchResult.status === 'fulfilled' ? launchResult.value : null;
    const demoMarketData = demoMarketResult.status === 'fulfilled' ? demoMarketResult.value : null;
    const hasLoadWarning = profileResult.status === 'rejected' || reservationsResult.status === 'rejected' || (isJobInfoMvpDevelopment && mvpResult.status === 'rejected') || (isClosedBetaDevelopment && profile.role === 'admin' && betaResult.status === 'rejected') || (isOpenBetaDevelopment && openBetaResult.status === 'rejected') || (isServiceLaunchDevelopment && launchResult.status === 'rejected');
    const mvpContent = isJobInfoMvpDevelopment
      ? (mvpData ? (profile.role === 'employer' ? employerMvp(profile, mvpData) : workerMvp(profile, mvpData)) : '<div class="dashboard-warning"><p><b>MVP 데이터를 불러오지 못했습니다.</b><br>저장 기능은 실행하지 않았습니다.</p><button type="button" id="retry-mvp">다시 불러오기</button></div>')
      : '';
    const betaContent = isClosedBetaDevelopment && profile.role === 'admin'
      ? (betaData ? closedBetaConsole(betaData) : '<div class="dashboard-warning"><p><b>클로즈 베타 데이터를 불러오지 못했습니다.</b><br>어떤 기록도 저장하지 않았습니다.</p></div>')
      : '';
    const openBetaContent = isOpenBetaDevelopment
      ? (openBetaData ? (profile.role === 'admin' ? openBetaAdminConsole(openBetaData) : openBetaMemberPanel(openBetaData, profile.role)) : '<div class="dashboard-warning"><p><b>오픈 베타 데이터를 불러오지 못했습니다.</b><br>어떤 기록도 저장하지 않았습니다.</p></div>')
      : '';
    const launchContent = isServiceLaunchDevelopment
      ? (launchData ? (profile.role === 'admin' ? serviceLaunchAdminConsole(launchData) : serviceLaunchMemberPanel(launchData, profile.role)) : '<div class="dashboard-warning"><p><b>정식 서비스 준비 데이터를 불러오지 못했습니다.</b><br>어떤 기록도 저장하지 않았습니다.</p></div>')
      : '';
    const notice = dashboardNotice;
    dashboardNotice = '';
    const roleLabel = profile.role === 'admin' ? '운영자' : profile.role === 'employer' ? '고용주' : '근로자';
    memberApp.innerHTML = `
      <div class="dashboard-head"><div><span>${roleLabel} 회원</span><h3>${escapeHtml(profile.full_name || session.user.email)}</h3><p>${escapeHtml(session.user.email)}</p></div><button type="button" class="button ghost" id="sign-out">로그아웃</button></div>
      ${notice ? `<div class="dashboard-notice">${escapeHtml(notice)}</div>` : ''}
      ${hasLoadWarning ? '<div class="dashboard-warning"><p><b>로그인은 정상적으로 완료되었습니다.</b><br>일부 정보를 잠시 불러오지 못했습니다.</p><button type="button" id="retry-dashboard">다시 불러오기</button></div>' : ''}
      <a class="button lime" href="#work-management">수동 매칭·전자계약·급여·거리 관리</a>
      ${mvpContent}
      ${betaContent}
      ${openBetaContent}
      ${launchContent}
      ${profile.role === 'admin' ? '' : demoMarketplacePanel(demoMarketData, profile.role)}
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
    memberApp.querySelector('[data-refresh-demo-interviews]')?.addEventListener('click', () => renderDashboard(session));
    memberApp.querySelectorAll('[data-demo-interview-decision]').forEach((button) => button.addEventListener('click', async () => {
      const actions = button.closest('.demo-interview-actions');
      const status = actions?.querySelector('.form-status');
      actions?.querySelectorAll('button').forEach((item) => { item.disabled = true; });
      if (status) status.textContent = '면접 응답을 저장하는 중입니다…';
      try {
        await decideDemoInterviewRequest(button.dataset.requestId, button.dataset.demoInterviewDecision);
        await renderDashboard(session);
      } catch (error) {
        if (status) {
          status.textContent = error.message;
          status.classList.add('error');
        }
        actions?.querySelectorAll('button').forEach((item) => { item.disabled = false; });
      }
    }));
    memberApp.querySelector('[data-demo-market-search]')?.addEventListener('input', (event) => {
      const query = event.currentTarget.value.trim().toLowerCase();
      const cards = [...memberApp.querySelectorAll('[data-demo-market-card]')];
      let visibleCount = 0;
      cards.forEach((card) => {
        const visible = !query || card.dataset.searchable.includes(query);
        card.hidden = !visible;
        if (visible) visibleCount += 1;
      });
      const empty = memberApp.querySelector('.demo-market-empty');
      if (empty) empty.hidden = visibleCount !== 0;
    });
    memberApp.querySelectorAll('[data-demo-interview]').forEach((card) => card.addEventListener('click', () => {
      const panel = memberApp.querySelector('[data-demo-interview-panel]');
      if (!panel) return;
      renderDemoInterview(panel, profile.role, {
        code: card.dataset.demoCode,
        name: card.dataset.demoName,
        detail: card.dataset.demoDetail,
        industry: card.dataset.demoIndustry
      });
    }));

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

    memberApp.querySelector('#beta-participant-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      const option = element.querySelector(`option[value="${formText(form, 'profile_id')}"]`);
      const button = element.querySelector('[type="submit"]');
      button.disabled = true;
      setFormMessage(element, '참여자 지정을 저장하는 중입니다…');
      try {
        await saveClosedBetaParticipant({ profileId: formText(form, 'profile_id'), participantRole: option.dataset.role });
        dashboardNotice = '클로즈 베타 참여자 지정이 DB에 저장되고 다시 조회되었습니다.';
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, `저장되지 않았습니다: ${error.message}`, 'error');
        button.disabled = false;
      }
    });

    memberApp.querySelector('#manual-introduction-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      const button = element.querySelector('[type="submit"]');
      button.disabled = true;
      setFormMessage(element, '수동 소개 내역을 저장하는 중입니다…');
      try {
        await createManualIntroduction({
          jobPostingId: formText(form, 'job_posting_id'), workerId: formText(form, 'worker_id'),
          employerFeedback: formText(form, 'employer_feedback'), comparisonNotes: formText(form, 'comparison_notes'),
          selectionReason: formText(form, 'selection_reason')
        });
        dashboardNotice = '운영자의 수동 비교·선택과 소개 내역이 DB에 저장되고 다시 조회되었습니다.';
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, `저장되지 않았습니다: ${error.message}`, 'error');
        button.disabled = false;
      }
    });

    memberApp.querySelectorAll('.beta-contract-form').forEach((contractForm) => contractForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      const status = formText(form, 'status');
      const method = formText(form, 'confirmation_method');
      if (status === 'confirmed' && !method) return setFormMessage(element, '체결 확인에는 확인 방법·근거가 필요합니다.', 'error');
      const button = element.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await saveContractConfirmation({ introductionId: element.dataset.introductionId, status, confirmationMethod: method, evidenceReference: formText(form, 'evidence_reference') });
        dashboardNotice = '근로계약 체결 확인 상태가 DB에 저장되고 다시 조회되었습니다.';
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, `저장되지 않았습니다: ${error.message}`, 'error');
        button.disabled = false;
      }
    }));

    memberApp.querySelectorAll('.beta-payment-form').forEach((paymentForm) => paymentForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const submitter = event.submitter;
      submitter.disabled = true;
      try {
        await savePaymentPreparation({ introductionId: element.dataset.introductionId, payerProfileId: element.dataset.payerProfileId, chargeStatus: submitter.value });
        dashboardNotice = submitter.value === 'test_completed'
          ? '실제 청구 없이 테스트 결제 흐름 완료 상태가 DB에 저장되었습니다.'
          : '테스트 결제수단 등록과 결제 동의가 DB에 저장되었습니다. 실제 청구는 없습니다.';
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, `처리되지 않았습니다: ${error.message}`, 'error');
        submitter.disabled = false;
      }
    }));

    memberApp.querySelectorAll('.beta-outcome-form').forEach((outcomeForm) => outcomeForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      const button = element.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await saveWorkOutcome({ introductionId: element.dataset.introductionId, attendanceStatus: formText(form, 'attendance_status'), firstShiftStatus: formText(form, 'first_shift_status'), contractOutcome: formText(form, 'contract_outcome'), outcomeNotes: formText(form, 'outcome_notes') });
        dashboardNotice = '출근·첫 근무·계약기간 결과가 DB에 저장되고 다시 조회되었습니다.';
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, `저장되지 않았습니다: ${error.message}`, 'error');
        button.disabled = false;
      }
    }));

    memberApp.querySelectorAll('.open-beta-distance').forEach((button) => button.addEventListener('click', async () => {
      const status = button.parentElement.querySelector('.form-status');
      button.disabled = true;
      status.textContent = '설정과 좌표를 확인하는 중입니다…';
      try {
        await calculateCommuteAssessment(button.dataset.introductionId);
        dashboardNotice = '설정된 계산 방식과 기준으로 거리를 판별해 DB에 저장했습니다.';
        await renderDashboard(session);
      } catch (error) {
        status.textContent = `판별되지 않았습니다: ${error.message}`;
        status.className = 'form-status error';
        button.disabled = false;
      }
    }));

    memberApp.querySelectorAll('.wage-response-form').forEach((wageForm) => wageForm.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      const button = element.querySelector('[type="submit"]');
      button.disabled = true;
      setFormMessage(element, '급여 지급 여부 응답을 저장하는 중입니다…');
      try {
        await saveWagePaymentResponse({ introductionId: element.dataset.introductionId, workerId: element.dataset.workerId, response: formText(form, 'response'), responseNote: formText(form, 'response_note') });
        dashboardNotice = '근로자의 급여 지급 여부 응답이 DB에 저장되었습니다. 미지급 확정이나 이용 제한으로 자동 처리되지 않습니다.';
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, `저장되지 않았습니다: ${error.message}`, 'error');
        button.disabled = false;
      }
    }));

    memberApp.querySelector('#reuse-intention-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      const button = element.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await saveReuseIntention({ introductionId: formText(form, 'introduction_id'), response: formText(form, 'response'), responseNote: formText(form, 'response_note') });
        dashboardNotice = '재이용 여부 응답이 실제 기록으로 DB에 저장되었습니다.';
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, `저장되지 않았습니다: ${error.message}`, 'error');
        button.disabled = false;
      }
    });

    memberApp.querySelector('#matching-criterion-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      const button = element.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await saveMatchingCriterion({ introductionId: formText(form, 'introduction_id'), criterionName: formText(form, 'criterion_name'), observation: formText(form, 'observation'), status: formText(form, 'status') });
        dashboardNotice = '실제 소개·근무 결과에 근거한 매칭 기준 관찰 기록이 DB에 저장되었습니다.';
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, `저장되지 않았습니다: ${error.message}`, 'error');
        button.disabled = false;
      }
    });

    memberApp.querySelector('#operating-cost-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      const button = element.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await saveOperatingCost({ costDate: formText(form, 'cost_date'), category: formText(form, 'category'), amountKrw: Number(form.get('amount_krw')), description: formText(form, 'description'), evidenceReference: formText(form, 'evidence_reference') });
        dashboardNotice = '입력한 실제 운영비용이 DB에 저장되고 집계에 반영되었습니다.';
        await renderDashboard(session);
      } catch (error) {
        setFormMessage(element, `저장되지 않았습니다: ${error.message}`, 'error');
        button.disabled = false;
      }
    });

    memberApp.querySelectorAll('.sync-service-case').forEach((button) => button.addEventListener('click', async () => {
      const status = button.parentElement.querySelector('.form-status');
      button.disabled = true;
      status.textContent = '수동 소개·계약·근무 결과를 확인하는 중입니다…';
      try {
        await syncServiceCase(button.dataset.introductionId);
        dashboardNotice = '현재 실제 기록을 기준으로 서비스 단계와 변경 이력이 DB에 저장되었습니다.';
        await renderDashboard(session);
      } catch (error) {
        status.textContent = `동기화되지 않았습니다: ${error.message}`;
        status.className = 'form-status error';
        button.disabled = false;
      }
    }));

    memberApp.querySelector('#employer-feedback-form')?.addEventListener('submit', async (event) => {
      event.preventDefault();
      const element = event.currentTarget;
      const form = new FormData(element);
      const select = element.querySelector('[name="introduction_id"]');
      const outcomeId = select.selectedOptions[0]?.dataset.outcomeId || '';
      const button = element.querySelector('[type="submit"]');
      button.disabled = true;
      try {
        await saveEmployerFeedback({ introductionId: formText(form, 'introduction_id'), workOutcomeId: outcomeId, feedbackType: formText(form, 'feedback_type'), feedbackText: formText(form, 'feedback_text') });
        dashboardNotice = '고용주 의견이 기존 기록을 덮어쓰지 않고 새 이력으로 DB에 저장되었습니다.';
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
  navigateSideways(document.querySelector('#member'), '#member');
}));

document.addEventListener('click', (event) => {
  const trigger = event.target.closest('.login-link, [data-expansion-login]');
  if (!trigger) return;
  event.preventDefault();
  const afterLogin = trigger.dataset.loginTarget;
  const showMember = () => navigateSideways(document.querySelector('#member'), '#member');
  if (!supabase) { authMode = 'login'; renderAuth(); showMember(); return; }
  void supabase.auth.getSession().then(async ({ data }) => {
    if (data.session) {
      await renderDashboard(data.session);
      if (afterLogin) navigateSideways(document.querySelector(afterLogin), afterLogin);
      else showMember();
      return;
    }
    if (afterLogin) sessionStorage.setItem('geugot-after-login-target', afterLogin);
    authMode = 'login';
    renderAuth();
    showMember();
  });
});

if (supabase) {
  supabase.auth.getSession().then(({ data }) => data.session ? renderDashboard(data.session) : renderAuth());
  supabase.auth.onAuthStateChange((_event, session) => {
    window.setTimeout(async () => {
      if (!session) { renderAuth(); return; }
      await renderDashboard(session);
      const afterLogin = sessionStorage.getItem('geugot-after-login-target');
      if (afterLogin) {
        sessionStorage.removeItem('geugot-after-login-target');
        navigateSideways(document.querySelector(afterLogin), afterLogin);
      }
    }, 0);
  });
} else {
  renderAuth();
}

const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) entry.target.classList.add('revealed');
}), { threshold: 0.12 });
document.querySelectorAll('.section, .matching-section, .visa-section').forEach((section) => observer.observe(section));
