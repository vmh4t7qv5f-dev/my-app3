import {
  getReportPath,
  isAudioUploaded,
  isJobWaitingForStart,
  isValidJobId,
} from "@/lib/server/jobs";

// 업로드가 끝났는지 확인하고 고유 링크를 알려 준다.
export async function POST(
  _request: Request,
  ctx: RouteContext<"/api/jobs/[id]/start">,
) {
  const { id } = await ctx.params;

  try {
    if (!isValidJobId(id) || !(await isJobWaitingForStart(id))) {
      return Response.json({ error: "job_not_found" }, { status: 404 });
    }
    if (!(await isAudioUploaded(id))) {
      return Response.json({ error: "upload_incomplete" }, { status: 409 });
    }
    return Response.json({ reportPath: getReportPath(id) });
  } catch {
    return Response.json({ error: "job_start_failed" }, { status: 500 });
  }
}
