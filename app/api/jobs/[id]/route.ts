import { getCurrentUser } from "@/lib/server/auth";
import { discardJob, getJobState, isValidJobId } from "@/lib/server/jobs";
import { getAccessibleJobTeamId } from "@/lib/server/teams";

// 팀원이 아니면 작업이 있는지도 알 수 없도록 없는 작업과 똑같이 다룬다.
async function getAccessibleJobState(id: string) {
  const user = await getCurrentUser();
  if (!user || !isValidJobId(id)) return null;
  return (await getAccessibleJobTeamId(id, user.id)) ? getJobState(id) : null;
}

// 진행 상태 화면이 주기적으로 부른다. 진행 단계만 돌려주고 수신자 주소나 회의 내용은 넣지 않는다.
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/jobs/[id]">,
) {
  const { id } = await ctx.params;

  try {
    const job = await getAccessibleJobState(id);
    // 시작되지 않은 작업의 주소도 없는 링크처럼 다룬다.
    if (!job || job.status === "pending") {
      return Response.json({ error: "job_not_found" }, { status: 404 });
    }
    return Response.json(
      { status: job.status, emailPending: job.emailPending },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "job_read_failed" }, { status: 500 });
  }
}

// 끝난 작업의 보고서를 지운다. 처리 중에 지우면 진행 중인 단계가 꼬이므로 막는다.
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/jobs/[id]">,
) {
  const { id } = await ctx.params;

  try {
    const job = await getAccessibleJobState(id);
    if (!job || job.status === "pending") {
      return Response.json({ error: "job_not_found" }, { status: 404 });
    }
    if (job.status !== "completed" && job.status !== "failed") {
      return Response.json({ error: "job_running" }, { status: 409 });
    }
    await discardJob(id);
    return new Response(null, { status: 204 });
  } catch {
    return Response.json({ error: "job_delete_failed" }, { status: 500 });
  }
}
