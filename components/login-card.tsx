import { Button } from "@/components/ui/button";

// 로그인이 끝나면 next 경로로 돌아온다.
export function LoginCard({
  next = "/",
  message = "구글 계정으로 로그인하면 팀을 만들고 회의 보고서를 날짜별로 저장할 수 있습니다.",
  hasError = false,
}: {
  next?: string;
  message?: string;
  hasError?: boolean;
}) {
  return (
    <div className="paper-card reveal-card flex flex-col items-start gap-4 p-5 sm:p-6">
      <p>{message}</p>
      {hasError && (
        <p role="alert" className="text-sm text-destructive">
          로그인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
      <form action="/auth/login" method="post">
        <input type="hidden" name="next" value={next} />
        <Button type="submit" size="lg">
          Google로 로그인
        </Button>
      </form>
    </div>
  );
}
