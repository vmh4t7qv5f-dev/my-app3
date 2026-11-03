import { getCurrentUser } from "@/lib/server/auth";
import { joinTeamByInvite } from "@/lib/server/teams";

// 초대 링크를 연 사람이 참여 버튼을 눌렀을 때 팀원으로 넣는다.
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/invites/[token]">,
) {
  const { token } = await ctx.params;

  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "login_required" }, { status: 401 });
    }
    const teamId = await joinTeamByInvite(token, user);
    if (!teamId) {
      return Response.json({ error: "invite_not_found" }, { status: 404 });
    }
    return Response.json({ teamId });
  } catch {
    return Response.json({ error: "team_join_failed" }, { status: 500 });
  }
}
