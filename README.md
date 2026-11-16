# 구독 체크리스트

## 1. 프로젝트 소개

개인용 정기구독 관리 웹앱입니다. 넷플릭스, 유튜브 프리미엄 같은 구독 서비스의 결제일과 금액을 한 화면에서 확인하고, 매달·매년 얼마를 쓰는지와 곧 결제될 구독을 놓치지 않는 것이 목적입니다.

## 2. 기술 스택

- **프론트엔드:** React 19, TypeScript, Vite, Tailwind CSS v4, React Router
- **데이터·로그인:** Supabase (PostgreSQL, Auth, RLS) / 환경 변수가 없으면 localStorage
- **아이콘:** simple-icons
- **테스트·검사:** Vitest, oxlint
- **배포:** Vercel

## 3. 이용 방법

**웹사이트:** https://subscriptionchecklist.vercel.app

- 아이디와 비밀번호로 회원가입한 뒤 로그인합니다. 데이터는 계정별로 분리됩니다.
- 구독을 추가하고 금액, 결제 주기, 결제일, 결제수단, 상태(구독중·무료체험·해지예정)를 입력합니다.
- 대시보드에서 이번 달 결제 달력, 구독 목록, 월·연 환산 합계를 봅니다.
- 결제일이 3일 이내로 다가온 구독과 끝나가는 무료체험은 배너로 알려 줍니다.
- 결제수단을 따로 등록해 구독별로 연결할 수 있습니다.

로컬에서 실행하면 Supabase 설정 없이도 **로컬 모드**로 동작합니다. 데이터는 브라우저에만 저장되고 샘플 데이터가 들어갑니다.

```bash
git clone https://github.com/imjw0826/subscriptionchecklist.git
cd subscriptionchecklist
npm install
npm run dev      # http://localhost:5173
```

자신의 Supabase에 연결하려면 SQL Editor에서 `supabase/schema.sql`을 실행하고, `.env.example`을 `.env.local`로 복사해 `VITE_SUPABASE_URL`과 `VITE_SUPABASE_ANON_KEY`를 채웁니다. Authentication 설정에서 Confirm email은 꺼야 합니다. `service_role` 키는 앱에 넣지 마세요.

## 4. 최근 업데이트

2026-11-07
