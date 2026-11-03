-- 음성 24시간 삭제와 오래된 보고서 만료를 위해 정리 주소를 매시간 부른다.
-- 비밀값은 이 파일에 적지 않고 Vault의 cleanup_secret에서 실행할 때 읽는다.
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'cleanup-hourly',
  '0 * * * *',
  $$
  select net.http_post(
    url := 'https://decisionflow-sable.vercel.app/api/cleanup',
    headers := jsonb_build_object(
      'content-type', 'application/json',
      'authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'cleanup_secret'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  );
  $$
);
