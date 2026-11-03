import { getCurrentUser } from "@/lib/server/auth";
import {
  getTeamDetail,
  isValidTeamId,
  removeMember,
} from "@/lib/server/teams";

// 팀원은 스스로 나갈 수 있고, 팀을 만든 사람은 다른 팀원을 내보낼 수 있다.
// 팀을 만든 사람이 나가면 내보낼 사람이 없어지므로 막는다.
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/teams/[id]/members/[userId]">,
) {
  const { id, userId } = await ctx.params;

  try {
    const user = await getCurrentUser();
    const team = user && isValidTeamId(id) ? await getTeamDetail(id) : null;
    if (
      !user ||
      !team ||
      !team.members.some((member) => member.userId === user.id)
    ) {
      return Response.json({ error: "team_not_found" }, { status: 404 });
    }

    const isCreator = team.createdBy === user.id;
    const isAllowed = isCreator ? userId !== user.id : userId === user.id;
    if (!isAllowed) {
      return Response.json({ error: "not_allowed" }, { status: 403 });
    }

    await removeMember(id, userId);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "member_remove_failed" }, { status: 500 });
  }
}
