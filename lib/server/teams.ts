import "server-only";

import { randomBytes } from "node:crypto";

import type { CurrentUser } from "./auth";
import { getSupabase } from "./supabase";

const TEAM_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const INVITE_TOKEN_PATTERN = /^[A-Za-z0-9_-]{32}$/;
const MAX_TEAM_NAME_LENGTH = 40;
const MAX_REPORTS_ON_TEAM_PAGE = 200;

export type Team = { id: string; name: string };
export type TeamMember = { userId: string; name: string; email: string };
export type TeamDetail = Team & {
  inviteToken: string;
  createdBy: string | null;
  members: TeamMember[];
};
export type TeamReportItem = {
  id: string;
  status: string;
  title: string | null;
  createdAt: string;
};

// 암호학적 난수 24바이트로 만들어 초대 링크를 추측할 수 없게 한다.
function createInviteToken(): string {
  return randomBytes(24).toString("base64url");
}

export function isValidTeamId(id: unknown): id is string {
  return typeof id === "string" && TEAM_ID_PATTERN.test(id);
}

export function isValidInviteToken(token: string): boolean {
  return INVITE_TOKEN_PATTERN.test(token);
}

// 앞뒤 공백을 지운 팀 이름을 돌려준다. 쓸 수 없는 이름이면 null이다.
export function parseTeamName(name: unknown): string | null {
  if (typeof name !== "string") return null;
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= MAX_TEAM_NAME_LENGTH
    ? trimmed
    : null;
}

export async function getUserTeams(userId: string): Promise<Team[]> {
  const { data, error } = await getSupabase()
    .from("team_members")
    .select("joined_at, teams!inner(id, name)")
    .eq("user_id", userId)
    .order("joined_at");
  if (error) throw new Error("팀을 읽지 못했습니다.");
  return data.flatMap(({ teams }) => teams as unknown as Team);
}

export async function isTeamMember(
  teamId: string,
  userId: string,
): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("team_members")
    .select("user_id")
    .eq("team_id", teamId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw new Error("팀원을 확인하지 못했습니다.");
  return data !== null;
}

// 작업이 속한 팀의 팀원일 때만 팀 고유 값을 돌려준다. 팀이 없는 예전 작업은 아무도 열 수 없다.
export async function getAccessibleJobTeamId(
  jobId: string,
  userId: string,
): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .select("team_id")
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw new Error("작업을 확인하지 못했습니다.");
  if (!data?.team_id) return null;
  return (await isTeamMember(data.team_id, userId)) ? data.team_id : null;
}

export async function createTeam(
  name: string,
  user: CurrentUser,
): Promise<string> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("teams")
    .insert({
      name,
      invite_token: createInviteToken(),
      created_by: user.id,
      is_guest: user.isGuest,
    })
    .select("id")
    .single();
  if (error) throw new Error("팀을 만들지 못했습니다.");

  try {
    await addMember(data.id, user);
  } catch (cause) {
    // 팀원이 없는 팀은 아무도 쓸 수 없으므로 되돌린다.
    await supabase.from("teams").delete().eq("id", data.id);
    throw cause;
  }
  return data.id;
}

async function addMember(teamId: string, user: CurrentUser): Promise<void> {
  const { error } = await getSupabase().from("team_members").upsert(
    {
      team_id: teamId,
      user_id: user.id,
      name: user.name,
      email: user.email,
    },
    { onConflict: "team_id,user_id", ignoreDuplicates: true },
  );
  if (error) throw new Error("팀에 참여하지 못했습니다.");
}

export async function getTeamByInvite(token: string): Promise<Team | null> {
  if (!isValidInviteToken(token)) return null;
  const { data, error } = await getSupabase()
    .from("teams")
    .select("id, name")
    .eq("invite_token", token)
    .maybeSingle();
  if (error) throw new Error("초대 링크를 확인하지 못했습니다.");
  return data;
}

export async function joinTeamByInvite(
  token: string,
  user: CurrentUser,
): Promise<string | null> {
  const team = await getTeamByInvite(token);
  if (!team) return null;
  await addMember(team.id, user);
  return team.id;
}

export async function getTeamDetail(
  teamId: string,
): Promise<TeamDetail | null> {
  const supabase = getSupabase();
  const { data: team, error } = await supabase
    .from("teams")
    .select("id, name, invite_token, created_by")
    .eq("id", teamId)
    .maybeSingle();
  if (error) throw new Error("팀을 읽지 못했습니다.");
  if (!team) return null;

  const { data: members, error: membersError } = await supabase
    .from("team_members")
    .select("user_id, name, email")
    .eq("team_id", teamId)
    .order("joined_at");
  if (membersError) throw new Error("팀원을 읽지 못했습니다.");

  return {
    id: team.id,
    name: team.name,
    inviteToken: team.invite_token,
    createdBy: team.created_by,
    members: members.map((member) => ({
      userId: member.user_id,
      name: member.name,
      email: member.email,
    })),
  };
}

// 초대 링크를 새로 만들면 이전 링크로는 더 참여할 수 없다.
export async function resetInviteToken(teamId: string): Promise<void> {
  const { error } = await getSupabase()
    .from("teams")
    .update({ invite_token: createInviteToken() })
    .eq("id", teamId);
  if (error) throw new Error("초대 링크를 새로 만들지 못했습니다.");
}

export async function removeMember(
  teamId: string,
  userId: string,
): Promise<void> {
  const { error } = await getSupabase()
    .from("team_members")
    .delete()
    .eq("team_id", teamId)
    .eq("user_id", userId);
  if (error) throw new Error("팀원을 내보내지 못했습니다.");
}

// 팀 화면의 날짜별 목록에 쓴다. 회의 내용은 첫 번째 사안 제목만 읽는다.
export async function getTeamReports(
  teamId: string,
): Promise<TeamReportItem[]> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .select("id, status, created_at, reports(title:content->topics->0->>title)")
    .eq("team_id", teamId)
    .not("status", "in", "(pending,failed)")
    .order("created_at", { ascending: false })
    .limit(MAX_REPORTS_ON_TEAM_PAGE);
  if (error) throw new Error("보고서 목록을 읽지 못했습니다.");

  return data.map((job) => {
    const report = job.reports as unknown as { title: string | null } | null;
    return {
      id: job.id,
      status: job.status,
      title: report?.title ?? null,
      createdAt: job.created_at,
    };
  });
}
