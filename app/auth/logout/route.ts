import { NextResponse } from "next/server";

import { createAuthClient } from "@/lib/server/auth";

const SEE_OTHER = 303;

export async function POST(request: Request) {
  const { origin } = new URL(request.url);
  try {
    const supabase = await createAuthClient();
    await supabase.auth.signOut();
  } catch {
    // 서비스 오류가 나도 첫 화면으로 돌려보낸다.
  }
  return NextResponse.redirect(`${origin}/`, SEE_OTHER);
}
