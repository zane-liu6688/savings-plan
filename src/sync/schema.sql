-- 攒钱计划（中国版）云同步所需的数据表与权限
-- 在 Supabase 控制台的 SQL Editor 里执行一次即可。
-- 表名用 app_state_cn，与澳洲版的 app_state 完全隔离，同一账号两份数据不会互相覆盖。

create table if not exists app_state_cn (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

alter table app_state_cn enable row level security;

drop policy if exists "own_row_cn" on app_state_cn;
create policy "own_row_cn" on app_state_cn
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
