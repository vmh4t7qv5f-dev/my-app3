import { NextResponse } from "next/server";

import { createAuthClient, getSafeNextPath } from "@/lib/server/auth";

// 구글 로그인에서 돌아온 코드를 로그인 쿠키로 바꾼다.
export async function GET(request: Request) {
  const { origin, searchParams } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    try {
      const supabase = await createAuthClient();
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(
          `${origin}${getSafeNextPath(searchParams.get("next"))}`,
        );
      }
    } catch {
      // 아래의 실패 안내로 보낸다.
    }
  }
  return NextResponse.redirect(`${origin}/?login_error=1`);
}
