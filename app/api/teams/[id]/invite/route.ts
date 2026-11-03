import { getCurrentUser } from "@/lib/server/auth";
import {
  isTeamMember,
  isValidTeamId,
  resetInviteToken,
} from "@/lib/server/teams";

// 링크가 새어 나갔을 때 이전 초대 링크를 막고 새 링크를 만든다. 팀원이면 누구나 할 수 있다.
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/teams/[id]/invite">,
) {
  const { id } = await ctx.params;

  try {
    const user = await getCurrentUser();
    if (!user || !isValidTeamId(id) || !(await isTeamMember(id, user.id))) {
      return Response.json({ error: "team_not_found" }, { status: 404 });
    }
    await resetInviteToken(id);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "invite_reset_failed" }, { status: 500 });
  }
}
