import { after } from "next/server";

import { findAudioProblem } from "@/lib/server/audio-check";
import {
  discardJob,
  downloadAudio,
  getReportPath,
  isAudioUploaded,
  isJobWaitingForStart,
  isValidJobId,
  startJob,
} from "@/lib/server/jobs";
import { runTranscribeStage } from "@/lib/server/pipeline";

export const maxDuration = 300;

// 업로드된 파일을 검사해 작업을 시작하고 바로 고유 링크를 알려 준다. 처리는 서버에서 계속된다.
export async function POST(
  request: Request,
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

    const audio = await downloadAudio(id);
    const problem = await findAudioProblem(audio);
    if (problem) {
      await discardJob(id);
      return Response.json({ error: problem }, { status: 422 });
    }

    const runToken = await startJob(id);
    if (!runToken) {
      return Response.json({ error: "job_not_found" }, { status: 404 });
    }

    const { origin } = new URL(request.url);
    after(() => runTranscribeStage(id, audio, runToken, origin));
    return Response.json({ reportPath: getReportPath(id) });
  } catch {
    return Response.json({ error: "job_start_failed" }, { status: 500 });
  }
}
