import { after } from "next/server";

import { consumeRunToken, failJob, isValidJobId } from "@/lib/server/jobs";
import { runAnalyzeStage } from "@/lib/server/pipeline";
import { transcriptSchema } from "@/lib/server/transcribe";

export const maxDuration = 300;

// 변환 단계만 부르는 내부 주소다. 일회용 인증값이 맞아야 실행되고, 바로 응답한 뒤 분석을 이어 간다.
export async function POST(
  request: Request,
  ctx: RouteContext<"/api/jobs/[id]/analyze">,
) {
  const { id } = await ctx.params;
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");

  try {
    if (!isValidJobId(id) || !token || !(await consumeRunToken(id, token))) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }

    const transcript = transcriptSchema.safeParse(
      await request.json().catch(() => null),
    );
    if (!transcript.success) {
      await failJob(id, "processing_failed");
      return Response.json({ error: "invalid_transcript" }, { status: 400 });
    }

    after(() => runAnalyzeStage(id, transcript.data));
    return Response.json({ accepted: true }, { status: 202 });
  } catch {
    return Response.json({ error: "analyze_start_failed" }, { status: 500 });
  }
}
