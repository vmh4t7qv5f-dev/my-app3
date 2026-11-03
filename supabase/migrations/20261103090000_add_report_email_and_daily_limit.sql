-- 보고서 메일 발송에 필요한 값과, 하루 5건 제한을 지키며 작업을 시작하는 함수를 추가한다.
-- 수신자 주소는 발송하거나 분석이 실패하면 바로 지운다.

alter table public.jobs
  add column recipient_emails text[],
  add column email_status text check (email_status in ('sent', 'failed'));

-- 시작 처리와 사용량 차감을 한 번에 해서 동시에 시작해도 5건을 넘지 않게 한다.
-- 돌려주는 값: started(시작함), not_pending(시작 전 작업이 아님), limit_reached(오늘 5건을 다 씀)
create function public.start_job(
  p_job_id text,
  p_run_token_hash text,
  p_recipient_emails text[]
)
returns text
language plpgsql
set search_path = ''
as $$
declare
  used integer;
begin
  update public.jobs
  set status = 'transcribing',
      run_token_hash = p_run_token_hash,
      recipient_emails = p_recipient_emails
  where id = p_job_id and status = 'pending';

  if not found then
    return 'not_pending';
  end if;

  insert into public.daily_usage as usage (day, count)
  values ((now() at time zone 'Asia/Seoul')::date, 1)
  on conflict (day) do update
    set count = usage.count + 1
    where usage.count < 5
  returning count into used;

  if used is null then
    update public.jobs
    set status = 'pending', run_token_hash = null, recipient_emails = null
    where id = p_job_id;
    return 'limit_reached';
  end if;

  return 'started';
end;
$$;

revoke execute on function public.start_job(text, text, text[]) from public, anon, authenticated;
grant execute on function public.start_job(text, text, text[]) to service_role;
