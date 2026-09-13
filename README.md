# 그곳잡

현장 근로자와 고용주를 연결하는 AI 보조 채용 매칭 PWA입니다. 바닐라 HTML/CSS/JavaScript와 Vite를 사용하며, Supabase 데이터베이스와 Vercel 배포를 기준으로 구성했습니다.

## 포함된 기능

- 고용주 대시보드와 채용 현황
- 출퇴근 거리·성실성·의사소통·업무 능력 기반의 추천 인재 목록
- AI 추천 근거와 고용주 최종 판단 UI
- 포인트 적립 내역 및 15,000P 이상 출금 규칙
- 외국인 근로자, 워킹홀리데이, 단기 비자 지원 안내
- 모바일 반응형 UI, 오프라인 셸 캐시, 홈 화면 설치(PWA)
- 이메일·비밀번호 회원가입/로그인과 자동 회원 프로필 생성
- 면접·상담·첫 출근 예약 등록, 조회, 취소
- Supabase Auth/RLS 기반 사용자별 데이터 보호

## 로컬 실행

Node.js 22 이상이 필요합니다.

```bash
npm install
copy .env.example .env
npm run dev
```

`.env`에 Supabase 프로젝트의 URL과 **publishable key**를 설정하세요. 설정하지 않으면 회원/예약 영역에 설정 안내가 표시됩니다. 브라우저 코드에는 secret/service role 키를 절대 넣지 마세요.

## Supabase 설정

1. Supabase 프로젝트를 생성합니다.
2. `supabase/migrations`의 SQL을 Dashboard SQL Editor 또는 Supabase CLI로 적용합니다.
3. Authentication > Providers > Email에서 이메일 제공자가 활성화되어 있는지 확인합니다. 이메일 확인을 사용하는 운영 환경에서는 Site URL과 Redirect URL도 설정합니다.
4. 회원가입 시 근로자/고용주 유형을 선택하면 `profiles` 행이 자동 생성됩니다. `admin` 역할은 클라이언트에서 설정할 수 없습니다.
5. AI 에이전트는 서버 환경에서만 secret key를 사용해 `matches`를 생성하고, 클라이언트에는 publishable key만 제공합니다.

마이그레이션은 모든 공개 테이블에 RLS를 적용합니다. 회원은 자신의 프로필과 예약만 관리할 수 있고, 프로필의 역할 변경과 포인트 원장 생성은 일반 클라이언트에서 허용하지 않습니다. 실제 출금 전에는 서버 함수에서 현재 원장 잔액, 중복 요청, 계좌 소유자를 다시 검증해야 합니다.

## Vercel 배포

GitHub 저장소를 Vercel에 연결한 뒤 아래 환경 변수를 Preview/Production에 각각 등록합니다.

```text
VITE_SUPABASE_URL
VITE_SUPABASE_PUBLISHABLE_KEY
```

빌드 명령은 `npm run build`, 출력 디렉터리는 `dist`입니다. `vercel.json`에 SPA 라우팅, 서비스 워커 캐시 제어, 기본 보안 헤더가 포함되어 있습니다.

## 중요 운영 원칙

AI 점수는 채용을 자동 결정하지 않으며, 설명 가능한 추천 근거만 제공합니다. 국적·비자 유형 같은 민감 정보는 법적 고용 가능성 확인 범위에서만 사용하고 점수 산정에는 사용하지 않는 것을 권장합니다. 실제 운영 전 노무·출입국·개인정보 전문가의 검토를 받으세요.
