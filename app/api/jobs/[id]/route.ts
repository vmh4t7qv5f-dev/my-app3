import { getJobState, isValidJobId } from "@/lib/server/jobs";

// 진행 상태 화면이 주기적으로 부른다. 진행 단계만 돌려주고 수신자 주소나 회의 내용은 넣지 않는다.
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/jobs/[id]">,
) {
  const { id } = await ctx.params;

  try {
    const job = isValidJobId(id) ? await getJobState(id) : null;
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
