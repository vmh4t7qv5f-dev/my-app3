import { createReport } from "@/lib/server/analyze";
import { findAudioProblem } from "@/lib/server/audio-check";
import {
  discardJob,
  downloadAudio,
  getReportPath,
  isAudioUploaded,
  isJobWaitingForStart,
  isValidJobId,
  markJobAnalyzing,
  markJobTranscribing,
} from "@/lib/server/jobs";
import { isTranscriptTooShort, transcribeAudio } from "@/lib/server/transcribe";

// 업로드된 파일을 검사해 변환하고 보고서 내용을 만든 뒤 고유 링크를 알려 준다.
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

    const audio = await downloadAudio(id);
    const problem = await findAudioProblem(audio);
    if (problem) {
      await discardJob(id);
      return Response.json({ error: problem }, { status: 422 });
    }

    if (!(await markJobTranscribing(id))) {
      return Response.json({ error: "job_not_found" }, { status: 404 });
    }

    const transcript = await transcribeAudio(audio);
    if (isTranscriptTooShort(transcript)) {
      await discardJob(id);
      return Response.json({ error: "too_little_speech" }, { status: 422 });
    }

    await markJobAnalyzing(id);
    const report = await createReport(transcript);
    if (!report) {
      await discardJob(id);
      return Response.json({ error: "not_a_meeting" }, { status: 422 });
    }

    return Response.json({ reportPath: getReportPath(id) });
  } catch {
    return Response.json({ error: "job_start_failed" }, { status: 500 });
  }
}
