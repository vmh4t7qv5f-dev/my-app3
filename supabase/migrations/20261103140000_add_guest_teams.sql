-- 게스트 체험용 팀을 구분한다. 게스트 팀의 보고서는 30일 뒤 자동으로 지운다.
alter table public.teams
  add column is_guest boolean not null default false;
