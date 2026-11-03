import { createJob, isDailyLimitReached } from "@/lib/server/jobs";

// 작업을 만들고 업로드 주소를 준다. 고유 링크는 업로드가 끝난 뒤 시작 요청에서 알려 준다.
export async function POST() {
  try {
    if (await isDailyLimitReached()) {
      return Response.json({ error: "daily_limit" }, { status: 429 });
    }
    const job = await createJob();
    return Response.json(job, { status: 201 });
  } catch {
    return Response.json({ error: "job_create_failed" }, { status: 500 });
  }
}
