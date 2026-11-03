-- 하루 제한을 없앴으므로 처리 건수 기록이 5를 넘어도 되게 한다.
alter table public.daily_usage
  drop constraint daily_usage_count_check,
  add constraint daily_usage_count_check check (count >= 0);
