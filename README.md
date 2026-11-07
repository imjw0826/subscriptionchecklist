# 구독 체크리스트

개인용 정기구독 관리 웹앱. 월 실부담 총액, 구독 목록, 이번 달 결제 달력을 한 화면에서 봅니다. (PRD: `구독 관리 웹앱 PRD.md`)

React + TypeScript + Vite + Tailwind CSS v4 · Supabase · Vitest

## 로컬 실행

```bash
npm install
npm run dev      # http://localhost:5173
npm test         # 계산 로직 테스트
npm run build
```

Supabase 환경변수가 없으면 **로컬 모드**로 동작합니다. 데이터는 이 브라우저의 localStorage에만 저장되고, 첫 실행 때 샘플 데이터(넷플릭스 공유, 쿠팡와우, 네이버플러스, 유튜브 프리미엄, 연 결제 iCloud, 무료체험 밀리의 서재)가 들어갑니다.

## 배포 (Supabase + Vercel)

### 1. Supabase — DB와 로그인

1. [supabase.com](https://supabase.com)에서 새 프로젝트 생성 (Region: Northeast Asia (Seoul))
2. **SQL Editor**에 `supabase/schema.sql` 전체를 붙여넣고 **Run** — 테이블 5개와 "본인 행만 접근" 보안 정책(RLS)이 만들어집니다
3. **Authentication → Sign In / Providers**에서 *Allow new users to sign up*을 켜고 **Confirm email을 끄기**. 아이디는 메일이 오가지 않는 내부 주소라 이메일 확인을 끝낼 수 없습니다
4. 앱의 **회원가입** 버튼으로 아이디와 비밀번호를 만듭니다. 주소를 아는 사람은 누구나 가입할 수 있고, 데이터는 RLS로 계정별로 분리됩니다
5. 입력값에 `@`가 있으면 이메일로 로그인합니다
6. **Project Settings → API**에서 `Project URL`과 `anon public`(또는 publishable) 키 복사

### 2. Vercel — 웹 배포

1. [vercel.com](https://vercel.com)에 GitHub로 로그인 → **Add New → Project** → `subscriptionchecklist` 저장소 **Import**
2. Framework는 Vite로 자동 인식됩니다. **Environment Variables**에 두 개 추가 후 **Deploy**
   - `VITE_SUPABASE_URL` = Project URL
   - `VITE_SUPABASE_ANON_KEY` = anon public 키

이후 GitHub `main`에 push하면 자동으로 다시 배포됩니다.

### 매직링크 계정을 아이디·비밀번호로 전환

기존 계정을 그대로 쓰면 구독 데이터도 그대로 유지됩니다. Supabase **SQL Editor**에서 아이디·비밀번호·기존 이메일을 바꿔 실행하세요.

```sql
update auth.users
set email = '아이디@subscriptionchecklist.vercel.app',
    encrypted_password = extensions.crypt('비밀번호', extensions.gen_salt('bf')),
    email_confirmed_at = coalesce(email_confirmed_at, now())
where email = '기존이메일@example.com';
```

아이디를 바꾸지 않고 기존 이메일로 로그인하려면 `email` 줄만 빼고 실행합니다.

### 로컬에서 클라우드 DB로 실행

```bash
cp .env.example .env.local   # 두 값을 채운 뒤
npm run dev
```

anon 키는 브라우저에 공개되는 용도의 키라 괜찮지만, `service_role` 키는 절대 앱이나 Vercel 환경변수에 넣지 마세요. 데이터 보호는 RLS 정책이 담당합니다.

## 구조

```
src/
  types.ts                 데이터 모델 (Subscription, PaymentMethod, Benefit, UsageLog)
  lib/calc.ts              계산 규칙 (순수 함수) + calc.test.ts
  lib/date.ts, format.ts   날짜(월말 보정, D-day)·금액 포맷
  store/repo.ts            저장소 추상화: localStorage / Supabase
  store/StoreContext.tsx   앱 상태와 CRUD, 지난 결제일 자동 갱신
  pages/                   대시보드, 상세, 구독 추가·편집, 결제수단, 로그인
  components/              구독 표, 결제 달력, 이용형 상세, 요금제 안내, 모션·토스트, 공통 UI
supabase/schema.sql        테이블 + RLS
```

## PRD 해석 메모

- **결제 배너**: 결제일 D-3 ~ D-DAY인 구독중(active) 구독을 표시합니다. 무료체험은 종료일 D-3 이내(지난 경우 포함)를 표시합니다.
- **무료체험 결제일**: 체험 중인 구독은 다음 결제일 = 체험 종료일이며 자동 갱신하지 않습니다. 체험이 끝나면 상태를 직접 바꿔주세요.
- **월말 결제일**: 1/31 → 2/28 → 3/31처럼 원래 날짜를 기준으로 주기를 더해 날짜가 밀리지 않습니다.
- **연 환산**: 월 환산액(반올림)×12가 아니라 주기당 금액×12/주기로 계산해 반올림 오차를 없앴습니다.
- **임시구독**: 해지예정 구독을 뜻합니다. 대시보드에서 무료체험과 같은 표에 나오고, 끝나면 더 내지 않으므로 종료 후 월 금액은 0원입니다.
- **결제 달력**: 구독중은 결제 주기로 이번 달 결제일을 계산해 이미 지난 날짜도 표시합니다. 무료체험은 종료일의 첫 결제만, 해지예정과 0원 구독은 표시하지 않습니다.
- **혜택 안내**: 혜택 체크리스트는 없앴고, 카탈로그 요금제의 혜택을 줄글로 보여줍니다. 카탈로그에 없는 구독은 예전에 등록한 혜택 이름을 문장으로 보여줍니다. `benefits`, `benefit_uses` 테이블과 기존 기록은 그대로 남겨 둡니다.

## 서비스 로고

- simple-icons(CC0)에 있는 브랜드(넷플릭스, 유튜브, 스포티파이 등)는 패키지의 아이콘을 사용합니다.
- 그 밖의 서비스는 각 회사가 App Store에 등록한 공식 앱 아이콘을 128px로 받아 `public/logos/`에 두었습니다 (2026-09-28 기준, 출처 is1-ssl.mzstatic.com). 로고의 권리는 각 회사에 있으며 서비스 식별 용도로만 씁니다.
- Microsoft 365는 네 색 사각형 마크를 직접 그려 씁니다. 이미지가 없거나 불러오지 못하면 브랜드 색 글자 마크로 대신합니다 (`src/lib/brandLogos.tsx`).
