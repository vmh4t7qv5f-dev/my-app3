import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// 로그인이 끊기지 않도록 만료가 가까운 로그인 쿠키를 새로 받는다. 권한 확인은 각 화면과 API가 한다.
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({ request });

  const hasSession = request.cookies
    .getAll()
    .some((cookie) => cookie.name.startsWith("sb-"));
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_PUBLISHABLE_KEY;
  if (!hasSession || !url || !key) return response;

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value),
        );
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  // 확인에 실패해도 화면은 열고, 각 화면이 로그인 안내를 보여 준다.
  await supabase.auth.getUser().catch(() => undefined);
  return response;
}

// 서버끼리 부르는 분석 단계와 정리 기능은 로그인과 상관없어 제외한다.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/cleanup|api/jobs/[^/]+/analyze).*)",
  ],
};
