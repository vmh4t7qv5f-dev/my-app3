-- 작업 상태, 보고서, 일일 사용량 테이블을 만든다.
-- 회의 내용 중에서는 완성된 보고서만 저장한다. 전체 변환 텍스트, 원본 파일 이름, 오류 원문은 넣지 않는다.

create table public.jobs (
  -- 고유 링크에 쓰는 추측하기 어려운 값이다. 앱에서 만들어 넣는다.
  id text primary key,
  status text not null default 'pending'
    check (status in ('pending', 'transcribing', 'analyzing', 'writing', 'completed', 'failed')),
  error_code text,
  -- 내부 분석 단계를 부를 때 쓰는 일회용 값의 해시다. 원래 값은 저장하지 않는다.
  run_token_hash text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.reports (
  job_id text primary key references public.jobs (id) on delete cascade,
  content jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '30 days'
);

create table public.daily_usage (
  -- 하루의 기준은 한국 시간 자정이다.
  day date primary key default (now() at time zone 'Asia/Seoul')::date,
  count integer not null default 0 check (count between 0 and 5)
);

-- 멈춘 작업을 찾을 수 있도록 작업이 바뀔 때마다 시각을 새로 기록한다.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger jobs_set_updated_at
  before update on public.jobs
  for each row execute function public.set_updated_at();

-- 서버 키로만 접근하도록 브라우저용 역할의 접근을 모두 막는다.
alter table public.jobs enable row level security;
alter table public.reports enable row level security;
alter table public.daily_usage enable row level security;

revoke all on public.jobs, public.reports, public.daily_usage from anon, authenticated;
revoke execute on function public.set_updated_at() from public, anon, authenticated;
