import { getCurrentUser } from "@/lib/server/auth";
import { createTeam, parseTeamName } from "@/lib/server/teams";

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "login_required" }, { status: 401 });
    }
    if (user.isGuest) {
      return Response.json({ error: "not_allowed" }, { status: 403 });
    }

    const body: { name?: unknown } | null = await request
      .json()
      .catch(() => null);
    const name = parseTeamName(body?.name);
    if (!name) {
      return Response.json({ error: "invalid_team_name" }, { status: 422 });
    }

    return Response.json({ id: await createTeam(name, user) }, { status: 201 });
  } catch {
    return Response.json({ error: "team_create_failed" }, { status: 500 });
  }
}
