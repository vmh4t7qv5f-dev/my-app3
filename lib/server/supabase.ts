import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "./env";

export const AUDIO_BUCKET = "audio";

let client: SupabaseClient | undefined;

// PRD에 따라 연결이 끊기거나 서비스 오류가 나면 자동으로 1회만 다시 시도한다.
const fetchWithRetry: typeof fetch = async (input, init) => {
  try {
    const response = await fetch(input, init);
    if (response.status < 500) return response;
  } catch {
    // 아래에서 다시 시도한다.
  }
  return fetch(input, init);
};

// 서버 키로 접속하는 연결이다. 모든 데이터를 볼 수 있으므로 호출 전에 권한을 확인한다.
// 사용자 로그인은 auth.ts의 연결이 맡으므로 여기에는 세션을 저장하지 않는다.
export function getSupabase(): SupabaseClient {
  client ??= createClient(
    getServerEnv("SUPABASE_URL"),
    getServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { fetch: fetchWithRetry },
    },
  );
  return client;
}
