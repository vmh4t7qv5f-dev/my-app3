-- 사용자 요청으로 하루 처리 건수 제한을 없앤다. 비용을 살펴볼 수 있도록 건수 기록만 남긴다.
create or replace function public.start_job(
  p_job_id text,
  p_run_token_hash text,
  p_recipient_emails text[]
)
returns text
language plpgsql
set search_path = ''
as $$
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
    set count = usage.count + 1;

  return 'started';
end;
$$;
