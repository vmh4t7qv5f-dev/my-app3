import { Button } from "@/components/ui/button";

function GoogleMark() {
  return (
    <svg viewBox="0 0 48 48" aria-hidden="true" className="size-5">
      <path
        fill="#EA4335"
        d="M24 9.5c3.5 0 6.7 1.2 9.2 3.6l6.9-6.9C35.9 2.4 30.4 0 24 0 14.6 0 6.5 5.4 2.6 13.2l8 6.2C12.5 13.6 17.8 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.9 24.5c0-1.6-.1-3.1-.4-4.5H24v9h12.9c-.6 3-2.2 5.5-4.7 7.2l7.7 6c4.5-4.2 7-10.3 7-17.7z"
      />
      <path
        fill="#FBBC05"
        d="M10.5 28.6c-.5-1.4-.8-3-.8-4.6s.3-3.2.8-4.6l-8-6.2C.9 16.4 0 20.1 0 24s.9 7.6 2.6 10.8l7.9-6.2z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.5 0 11.9-2.1 15.9-5.8l-7.7-6c-2.1 1.4-4.9 2.3-8.2 2.3-6.2 0-11.5-4.1-13.4-9.9l-8 6.2C6.5 42.6 14.6 48 24 48z"
      />
    </svg>
  );
}

// 로그인이 끝나면 next 경로로 돌아온다.
export function LoginCard({
  next = "/",
  message = "구글 계정으로 로그인하면 팀을 만들고 회의 보고서를 날짜별로 저장할 수 있습니다.",
  hasError = false,
  allowGuest = false,
}: {
  next?: string;
  message?: string;
  hasError?: boolean;
  allowGuest?: boolean;
}) {
  return (
    <div className="glass-card glass-card--rose reveal-card mx-auto flex w-full max-w-md flex-col gap-5 p-6 sm:p-8">
      <div className="flex flex-col gap-2">
        <h2 className="text-2xl font-semibold">로그인</h2>
        <p className="leading-relaxed text-white/90">{message}</p>
      </div>
      {hasError && (
        <p role="alert" className="card-inset text-sm text-destructive">
          로그인하지 못했습니다. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
      <form action="/auth/login" method="post">
        <input type="hidden" name="next" value={next} />
        <Button
          type="submit"
          size="lg"
          variant="outline"
          className="w-full gap-3 border-transparent bg-white text-[#2d2d2d] shadow-sm hover:bg-white/90"
        >
          <GoogleMark />
          Google로 로그인
        </Button>
      </form>
      <p className="text-center text-sm text-white/90">
        구글 비밀번호는 이 앱에 전달되지 않습니다.
      </p>
      {allowGuest && (
        <form
          action="/auth/guest"
          method="post"
          className="flex flex-col gap-2 border-t border-white/30 pt-5"
        >
          <Button
            type="submit"
            size="lg"
            variant="ghost"
            className="w-full border-white/70 text-white hover:bg-white/15 hover:text-white"
          >
            게스트로 체험하기
          </Button>
          <p className="text-center text-sm break-keep text-white/90">
            구글 계정 없이 음성을 올려 보고서를 받아 봅니다.
          </p>
        </form>
      )}
    </div>
  );
}
