import { connection } from "next/server";

import { getRemainingJobsToday } from "@/lib/server/jobs";

// 업로드 화면이 오늘 남은 처리 건수를 보여 줄 때 부른다. 숫자만 돌려준다.
export async function GET() {
  await connection();

  try {
    return Response.json(
      { remaining: await getRemainingJobsToday() },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return Response.json({ error: "usage_read_failed" }, { status: 500 });
  }
}
