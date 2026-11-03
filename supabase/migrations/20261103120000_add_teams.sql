-- 구글 로그인 사용자가 팀을 만들고 팀별로 보고서를 저장하도록 팀과 팀원 테이블을 추가한다.
-- 팀 보고서는 직접 삭제할 때까지 보관한다. 음성과 전체 변환 텍스트를 저장하지 않는 규칙은 그대로다.

create table public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 40),
  -- 초대 링크에 쓰는 추측하기 어려운 값이다. 앱에서 만들어 넣고, 새로 만들면 이전 링크는 막힌다.
  invite_token text not null unique,
  created_by uuid references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- 팀원 목록에 보여 주려고 참여할 때의 구글 이름과 주소를 적어 둔다.
  name text not null,
  email text not null,
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);

create index team_members_user_id_idx on public.team_members (user_id);

-- 이 변경 전에 만든 작업은 팀이 없어 아무도 열 수 없고, 30일이 지나면 지워진다.
alter table public.jobs
  add column team_id uuid references public.teams (id) on delete cascade;

create index jobs_team_id_created_at_idx on public.jobs (team_id, created_at desc);

-- 만료일이 비어 있는 보고서는 자동으로 지우지 않는다. 이미 있는 보고서의 만료일은 그대로 둔다.
alter table public.reports
  alter column expires_at drop not null,
  alter column expires_at drop default;

-- 서버 키로만 접근하도록 브라우저용 역할의 접근을 모두 막는다. 권한은 서버 코드에서 확인한다.
alter table public.teams enable row level security;
alter table public.team_members enable row level security;

revoke all on public.teams, public.team_members from anon, authenticated;
