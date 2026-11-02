import "server-only";

type ServerEnvName =
  | "OPENAI_API_KEY"
  | "SUPABASE_URL"
  | "SUPABASE_SERVICE_ROLE_KEY";

// 값이 없으면 어떤 변수가 빠졌는지만 알린다. 값 자체는 오류에 넣지 않는다.
export function getServerEnv(name: ServerEnvName): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`환경 변수 ${name}이(가) 설정되지 않았습니다.`);
  }
  return value;
}
