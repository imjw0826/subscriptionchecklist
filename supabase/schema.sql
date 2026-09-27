-- 구독 체크리스트 스키마
-- Supabase 대시보드 → SQL Editor에 전체를 붙여넣고 실행하세요.
-- 모든 행은 user_id(기본값 auth.uid())로 소유자가 정해지고, RLS로 본인 행만 접근 가능합니다.

create table if not exists payment_methods (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  nickname text not null,
  type text not null check (type in ('card', 'account', 'easypay')),
  last4 text not null default '' check (last4 ~ '^[0-9]{0,4}$'),
  created_at timestamptz not null default now()
);

create table if not exists subscriptions (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  name text not null,
  category text not null default '',
  list_price integer not null check (list_price >= 0),
  cycle_months integer not null default 1 check (cycle_months >= 1),
  next_billing_date date not null,
  payment_method_id uuid references payment_methods on delete set null,
  status text not null default 'active' check (status in ('active', 'trial', 'canceling')),
  trial_end_date date,
  price_after_trial integer check (price_after_trial >= 0),
  discount_type text not null default 'none' check (discount_type in ('none', 'amount', 'percent')),
  discount_value integer not null default 0 check (discount_value >= 0),
  share_count integer not null default 1 check (share_count >= 1),
  my_share_override integer check (my_share_override >= 0),
  detail_type text not null default 'usage' check (detail_type in ('benefit', 'usage')),
  usage_unit text not null default 'count' check (usage_unit in ('count', 'minutes')),
  usage_target integer not null default 0 check (usage_target >= 0),
  memo text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists benefits (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  subscription_id uuid not null references subscriptions on delete cascade,
  name text not null,
  reset_cycle text not null default 'monthly' check (reset_cycle in ('monthly', 'none')),
  estimated_value integer not null default 0 check (estimated_value >= 0),
  created_at timestamptz not null default now()
);

create table if not exists benefit_uses (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  benefit_id uuid not null references benefits on delete cascade,
  subscription_id uuid not null references subscriptions on delete cascade,
  date date not null,
  saved_amount integer not null check (saved_amount >= 0),
  note text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists usage_logs (
  id uuid primary key,
  user_id uuid not null default auth.uid() references auth.users on delete cascade,
  subscription_id uuid not null references subscriptions on delete cascade,
  date date not null,
  amount integer not null check (amount > 0),
  created_at timestamptz not null default now()
);

-- Row Level Security: 로그인한 본인 행만
do $$
declare t text;
begin
  foreach t in array array['payment_methods', 'subscriptions', 'benefits', 'benefit_uses', 'usage_logs'] loop
    execute format('alter table %I enable row level security', t);
    execute format('drop policy if exists "owner only" on %I', t);
    execute format(
      'create policy "owner only" on %I for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid())',
      t
    );
  end loop;
end $$;
