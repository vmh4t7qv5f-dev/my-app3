import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { DotText } from "@/components/dot-text";
import { JoinTeamButton } from "@/components/join-team-button";
import { LoginCard } from "@/components/login-card";
import { buttonVariants } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/server/auth";
import { getTeamByInvite, isTeamMember } from "@/lib/server/teams";

// 초대 링크가 검색에 잡히거나 다른 사이트로 주소가 넘어가지 않게 한다.
export const metadata: Metadata = {
  title: "팀 초대 | DecisionFlow",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

async function InviteContent({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return (
      <LoginCard
        next={`/invite/${token}`}
        message="팀 초대를 받았습니다. 참여하려면 구글 계정으로 로그인해 주세요."
      />
    );
  }

  const team = await getTeamByInvite(token);
  if (!team) {
    return (
      <div className="paper-card reveal-card flex flex-col items-start gap-4 p-5">
        <p>
          쓸 수 없는 초대 링크입니다. 팀원에게 새 초대 링크를 받아 주세요.
        </p>
        <Link href="/" className={buttonVariants({ size: "lg" })}>
          첫 화면으로
        </Link>
      </div>
    );
  }

  if (await isTeamMember(team.id, user.id)) {
    return (
      <div className="paper-card reveal-card flex flex-col items-start gap-4 p-5">
        <p>이미 {team.name} 팀의 팀원입니다.</p>
        <Link
          href={`/teams/${team.id}`}
          className={buttonVariants({ size: "lg" })}
        >
          팀으로 가기
        </Link>
      </div>
    );
  }

  return (
    <div className="paper-card reveal-card flex flex-col items-start gap-4 p-5">
      <p>
        <strong>{team.name}</strong> 팀에 초대받았습니다. 참여하면 팀원에게 이름과 구글
        주소가 보이고, 팀의 보고서를 보고 삭제할 수 있습니다.
      </p>
      <JoinTeamButton token={token} />
    </div>
  );
}

export default function InvitePage({ params }: PageProps<"/invite/[token]">) {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-6 px-4 py-12">
      <DotText text="DecisionFlow" className="h-6 self-start text-primary" />
      <h1 className="text-[clamp(24px,3.1vw,40px)] leading-[1.223] font-normal tracking-[0.015em] text-[#202020]">
        팀 초대
      </h1>
      <Suspense fallback={<p>초대를 확인하고 있습니다...</p>}>
        <InviteContent params={params} />
      </Suspense>
    </main>
  );
}
