import { NextResponse } from "next/server";

import { createAuthClient, GUEST_NAME } from "@/lib/server/auth";
import { createTeam } from "@/lib/server/teams";

const SEE_OTHER = 303;
const GUEST_TEAM_NAME = "게스트 팀";

// 구글 계정 없이 체험하도록 익명 계정과 그 사람만 쓰는 팀을 만든다.
export async function POST(request: Request) {
  const { origin } = new URL(request.url);

  try {
    const supabase = await createAuthClient();
    const { data, error } = await supabase.auth.signInAnonymously();
    if (error || !data.user) throw new Error("guest_login_failed");

    try {
      await createTeam(GUEST_TEAM_NAME, {
        id: data.user.id,
        name: GUEST_NAME,
        email: "",
        isGuest: true,
      });
    } catch (cause) {
      // 팀이 없는 게스트는 아무것도 할 수 없으므로 로그인을 되돌린다.
      await supabase.auth.signOut().catch(() => undefined);
      throw cause;
    }
    return NextResponse.redirect(`${origin}/`, SEE_OTHER);
  } catch {
    return NextResponse.redirect(`${origin}/?login_error=1`, SEE_OTHER);
  }
}
