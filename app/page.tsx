import { Suspense, type CSSProperties } from "react";

import { AccountBar } from "@/components/account-bar";
import { CreateTeamForm } from "@/components/create-team-form";
import { DotText } from "@/components/dot-text";
import { LoginCard } from "@/components/login-card";
import { UploadForm } from "@/components/upload-form";
import { getCurrentUser } from "@/lib/server/auth";
import { getUserTeams } from "@/lib/server/teams";

// 로그인과 소속 팀에 따라 로그인 안내, 팀 만들기, 업로드 화면 중 하나를 보여 준다.
async function HomeContent({
  searchParams,
}: {
  searchParams: Promise<{ login_error?: string | string[] }>;
}) {
  const { login_error: loginError } = await searchParams;
  const user = await getCurrentUser();
  if (!user) return <LoginCard hasError={Boolean(loginError)} />;

  const teams = await getUserTeams(user.id);

  return (
    <>
      <AccountBar user={user} teams={teams} />
      {teams.length === 0 ? (
        <div className="paper-card reveal-card flex flex-col gap-4 p-5 sm:p-6">
          <p>
            보고서는 팀에 저장됩니다. 팀을 만들거나, 팀원에게 받은 초대 링크를 열어
            참여해 주세요.
          </p>
          <CreateTeamForm />
        </div>
      ) : (
        <>
          <UploadForm teams={teams} />
          <details className="paper-card p-5">
            <summary className="cursor-pointer font-semibold">
              다른 팀 만들기
            </summary>
            <div className="mt-4">
              <CreateTeamForm />
            </div>
          </details>
        </>
      )}
    </>
  );
}

export default function Home({ searchParams }: PageProps<"/">) {
  return (
    <main className="mx-auto flex w-full max-w-[1333px] flex-1 flex-col gap-8 px-[clamp(14px,3.6vw,54px)] py-[clamp(24px,6vh,64px)] lg:gap-12">
      <header className="grid items-start gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,clamp(260px,32vw,483px))] md:gap-10">
        <h1 className="reveal-text m-0 text-primary">
          <DotText
            text="DecisionFlow"
            className="h-[clamp(28px,4vw,46px)] max-w-full"
          />
        </h1>
        <p
          className="reveal-text text-[clamp(14px,1.36vw,18px)] leading-[1.62] tracking-[-0.017em] text-muted-foreground"
          style={{ "--reveal-delay": "0.15s" } as CSSProperties}
        >
          회의나 대화 음성을 올리면 결정 사항, 미해결 문제, AI 제안과 추천
          결론을 구분한 의사결정 보고서를 만듭니다.
        </p>
      </header>
      <Suspense fallback={<p>불러오고 있습니다...</p>}>
        <HomeContent searchParams={searchParams} />
      </Suspense>
    </main>
  );
}
