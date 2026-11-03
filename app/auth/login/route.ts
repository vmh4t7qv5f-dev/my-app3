import { NextResponse } from "next/server";

import { createAuthClient, getSafeNextPath } from "@/lib/server/auth";

const SEE_OTHER = 303;

// 구글 로그인 화면으로 보낸다. 로그인이 끝나면 /auth/callback으로 돌아온다.
export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  const form = await request.formData().catch(() => null);
  const next = getSafeNextPath(form?.get("next"));

  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${origin}/auth/callback?next=${encodeURIComponent(next)}`,
        skipBrowserRedirect: true,
        queryParams: { prompt: "select_account" },
      },
    });
    if (error || !data.url) throw new Error("login_failed");
    return NextResponse.redirect(data.url, SEE_OTHER);
  } catch {
    return NextResponse.redirect(`${origin}/?login_error=1`, SEE_OTHER);
  }
}
