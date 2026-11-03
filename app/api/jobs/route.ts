import { getCurrentUser } from "@/lib/server/auth";
import { createJob } from "@/lib/server/jobs";
import { isTeamMember, isValidTeamId } from "@/lib/server/teams";

// 작업을 만들고 업로드 주소를 준다. 고유 링크는 업로드가 끝난 뒤 시작 요청에서 알려 준다.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return Response.json({ error: "login_required" }, { status: 401 });
    }

    const body: { teamId?: unknown } | null = await request
      .json()
      .catch(() => null);
    const teamId = body?.teamId;
    if (!isValidTeamId(teamId) || !(await isTeamMember(teamId, user.id))) {
      return Response.json({ error: "not_team_member" }, { status: 403 });
    }

    const job = await createJob(teamId);
    return Response.json(job, { status: 201 });
  } catch {
    return Response.json({ error: "job_create_failed" }, { status: 500 });
  }
}
