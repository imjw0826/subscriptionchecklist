# 구독 체크리스트

개인용 정기구독 관리 웹앱. 월 실부담 총액, 다음 결제, 구독별 본전 달성률을 한 화면에서 봅니다. (PRD: `구독 관리 웹앱 PRD.md`)

React + TypeScript + Vite + Tailwind CSS v4 · Supabase · Vitest

## 로컬 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 계산 로직 테스트
npm run build
```

Supabase 환경변수가 없으면 **로컬 모드**로 동작합니다. 데이터는 이 브라우저의 localStorage에만 저장되고, 첫 실행 때 샘플 데이터(넷플릭스 공유, 쿠팡와우, 네이버플러스, 유튜브 프리미엄, 연 결제 iCloud, 무료체험 밀리의 서재)가 들어갑니다.

## Supabase 연결 (PC·휴대폰 동기화)

1. [supabase.com](https://supabase.com)에서 무료 프로젝트 생성
2. **SQL Editor**에 `supabase/schema.sql` 전체를 붙여넣고 실행 (테이블 5개 + RLS 정책)
3. **Authentication → Users → Add user**로 본인 이메일 계정 1개 생성
4. **Authentication → Sign In / Providers**에서 *Allow new users to sign up* 끄기 (앱에서도 `shouldCreateUser: false`로 새 계정 생성을 막음)
5. **Authentication → URL Configuration**에서 Site URL과 Redirect URLs에 `http://localhost:5173`, 배포 주소 추가
6. **Project Settings → API**의 URL과 anon key를 `.env.local`에 입력

   ```bash
   cp .env.example .env.local
   ```

7. `npm run dev` → 이메일 입력 → 메일의 매직링크로 로그인

로컬 모드에서 쓰던 데이터는 대시보드 하단 **JSON 내보내기** → Supabase 연결 후 **JSON 가져오기**로 옮길 수 있습니다.

## Vercel 배포

1. 이 폴더를 GitHub 저장소로 push
2. Vercel → Add New Project → 저장소 선택 (Framework: Vite 자동 인식)
3. Environment Variables에 `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` 추가 후 Deploy
4. 배포 주소를 Supabase Redirect URLs에 추가

SPA 라우팅용 `vercel.json`(Netlify는 `public/_redirects`)이 포함되어 있습니다.

## 구조

```
src/
  types.ts                 데이터 모델 (Subscription, PaymentMethod, Benefit, BenefitUse, UsageLog)
  lib/calc.ts              계산 규칙 (순수 함수) + calc.test.ts
  lib/date.ts, format.ts   날짜(월말 보정, D-day)·금액 포맷
  store/repo.ts            저장소 추상화: localStorage / Supabase
  store/StoreContext.tsx   앱 상태와 CRUD, 지난 결제일 자동 갱신
  pages/                   대시보드, 상세, 구독 추가·편집, 결제수단, 로그인
  components/              카드, 혜택형/이용형 상세, 백업, 공통 UI
supabase/schema.sql        테이블 + RLS
```

## PRD 해석 메모

- **결제 배너**: 결제일 D-3 ~ D-DAY인 구독중(active) 구독을 표시합니다. 무료체험은 종료일 D-3 이내(지난 경우 포함)를 표시합니다.
- **무료체험 달성률**: 체험 중 실부담은 0원이라, 혜택형 달성률은 *체험 종료 후 월 실부담액*을 기준으로 계산합니다.
- **무료체험 결제일**: 체험 중인 구독은 다음 결제일 = 체험 종료일이며 자동 갱신하지 않습니다. 체험이 끝나면 상태를 직접 바꿔주세요.
- **월말 결제일**: 1/31 → 2/28 → 3/31처럼 원래 날짜를 기준으로 주기를 더해 날짜가 밀리지 않습니다.
- **연 환산**: 월 환산액(반올림)×12가 아니라 주기당 금액×12/주기로 계산해 반올림 오차를 없앴습니다.
- **혜택 체크 해제**: 체크된 혜택을 다시 누르면 해당 기간(매월 리셋이면 이번 달)의 사용 기록을 삭제합니다. 같은 달에 여러 번 쓰면 “+ 또 사용”으로 추가 기록합니다.
