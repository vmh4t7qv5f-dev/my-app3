import { createHash, timingSafeEqual } from "node:crypto";

import { runCleanup } from "@/lib/server/cleanup";
import { getServerEnv } from "@/lib/server/env";

export const maxDuration = 300;

function hash(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

// 비밀값을 한 글자씩 맞혀 보지 못하도록 길이와 상관없이 같은 시간에 비교한다.
function isAuthorized(request: Request): boolean {
  const token = request.headers.get("authorization")?.replace(/^Bearer /, "");
  return (
    !!token && timingSafeEqual(hash(token), hash(getServerEnv("CLEANUP_SECRET")))
  );
}

// 예약 실행이 매시간 부르는 주소다. 비밀값이 맞아야 실행되고 건수만 돌려준다.
export async function POST(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return Response.json({ error: "unauthorized" }, { status: 401 });
    }
    return Response.json(await runCleanup());
  } catch {
    return Response.json({ error: "cleanup_failed" }, { status: 500 });
  }
}
