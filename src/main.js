import './styles.css';

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
        <div class="person"><span class="avatar">NA</span><div><strong>NGUYEN AN</strong><small>생산·포장 · 경력 3년</small></div><i>적합</i></div>
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

    <section class="start-section" id="start"><span class="brand-mark large">ㄱ</span><p class="eyebrow light">START WITH GEUGOT JOB</p><h2>좋은 채용은,<br>서로의 조건을 아는 데서 시작합니다.</h2><div><button class="button lime" data-start="employer">고용주로 시작하기 ${icon('arrow', 18)}</button><button class="button ghost" data-start="worker">근로자로 시작하기</button></div><p class="start-status" role="status" aria-live="polite"></p></section>
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
document.querySelectorAll('[data-start]').forEach((button) => button.addEventListener('click', () => {
  const role = button.dataset.start === 'employer' ? '고용주' : '근로자';
  document.querySelector('.start-status').textContent = `${role} 사전 등록을 준비하고 있습니다. 곧 만나요!`;
}));

const observer = new IntersectionObserver((entries) => entries.forEach((entry) => {
  if (entry.isIntersecting) entry.target.classList.add('revealed');
}), { threshold: 0.12 });
document.querySelectorAll('.section, .matching-section, .visa-section').forEach((section) => observer.observe(section));
