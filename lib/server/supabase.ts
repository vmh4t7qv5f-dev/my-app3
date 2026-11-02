import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getServerEnv } from "./env";

export const AUDIO_BUCKET = "audio";

let client: SupabaseClient | undefined;

// 서버 키로 접속하는 연결이다. 로그인 기능이 없으므로 세션을 저장하지 않는다.
export function getSupabase(): SupabaseClient {
  client ??= createClient(
    getServerEnv("SUPABASE_URL"),
    getServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
  return client;
}
