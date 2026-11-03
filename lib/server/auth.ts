import "server-only";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";

import { getServerEnv } from "./env";

export const GUEST_NAME = "게스트";

export type CurrentUser = {
  id: string;
  name: string;
  email: string;
  isGuest: boolean;
};

// 사용자의 로그인 쿠키로 접속하는 연결이다. 로그인 처리에만 쓰고 데이터는 읽지 않는다.
export async function createAuthClient() {
  const cookieStore = await cookies();
  return createServerClient(
    getServerEnv("SUPABASE_URL"),
    getServerEnv("SUPABASE_PUBLISHABLE_KEY"),
    {
      cookies: {
        getAll: () => cookieStore.getAll(),
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 화면을 그리는 중에는 쿠키를 쓸 수 없다. 갱신은 proxy.ts가 맡는다.
          }
        },
      },
    },
  );
}

// 쿠키만 믿지 않고 Supabase에 확인한 사용자만 돌려준다.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  // 로그인 확인은 요청마다 해야 하며, 미리 만들어 두는 화면에 들어가면 안 된다.
  await connection();
  const supabase = await createAuthClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  if (user.is_anonymous) {
    return { id: user.id, email: "", name: GUEST_NAME, isGuest: true };
  }

  const email = user.email ?? "";
  const metadata = user.user_metadata as { full_name?: string; name?: string };
  return {
    id: user.id,
    email,
    name: metadata.full_name ?? metadata.name ?? email,
    isGuest: false,
  };
}

// 다른 사이트로 넘어가지 않도록 이 앱 안의 경로만 허용한다.
export function getSafeNextPath(next: unknown): string {
  return typeof next === "string" && /^\/(?![/\\])/.test(next) ? next : "/";
}
