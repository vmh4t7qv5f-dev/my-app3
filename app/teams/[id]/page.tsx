import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";

import { AccountBar } from "@/components/account-bar";
import { DotText } from "@/components/dot-text";
import { InviteLinkBox } from "@/components/invite-link-box";
import { LoginCard } from "@/components/login-card";
import { RemoveMemberButton } from "@/components/remove-member-button";
import { getCurrentUser } from "@/lib/server/auth";
import {
  getTeamDetail,
  getTeamReports,
  getUserTeams,
  isValidTeamId,
  type TeamReportItem,
} from "@/lib/server/teams";

// 초대 링크가 담긴 화면이므로 검색에 잡히거나 다른 사이트로 주소가 넘어가지 않게 한다.
export const metadata: Metadata = {
  title: "팀 보고서 | MeetIQ",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const DATE_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "full",
  timeZone: "Asia/Seoul",
});
const TIME_FORMAT = new Intl.DateTimeFormat("ko-KR", {
  timeStyle: "short",
  timeZone: "Asia/Seoul",
});

// 한국 날짜 기준으로 묶는다. 목록이 최신순이므로 묶음도 최신 날짜부터 나온다.
function groupByDay(reports: TeamReportItem[]) {
  const groups = new Map<string, TeamReportItem[]>();
  for (const report of reports) {
    const day = DATE_FORMAT.format(new Date(report.createdAt));
    groups.set(day, [...(groups.get(day) ?? []), report]);
  }
  return [...groups];
}

async function TeamContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) {
    return (
      <LoginCard
        next={`/teams/${id}`}
        message="팀 보고서를 보려면 로그인해 주세요."
      />
    );
  }

  const team = isValidTeamId(id) ? await getTeamDetail(id) : null;
  const isMember = team?.members.some((member) => member.userId === user.id);
  // 팀원이 아니면 팀이 있는지도 알 수 없게 같은 안내를 보여 준다.
  if (!team || !isMember) {
    return (
      <div className="paper-card reveal-card p-5">
        <p>팀을 찾을 수 없습니다. 링크가 잘못되었거나 이 팀의 팀원이 아닙니다.</p>
      </div>
    );
  }

  const [teams, reports] = await Promise.all([
    getUserTeams(user.id),
    getTeamReports(id),
  ]);
  const isCreator = team.createdBy === user.id;

  return (
    <>
      <AccountBar user={user} teams={teams} />
      <h1 className="text-[clamp(24px,3.1vw,40px)] leading-[1.223] font-normal tracking-[0.015em] text-[#202020]">
        {team.name}
      </h1>

      <section className="paper-card reveal-card flex flex-col gap-5 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">날짜별 보고서</h2>
        {reports.length === 0 ? (
          <p className="text-muted-foreground">
            아직 보고서가 없습니다. 음성을 올리면 이곳에 날짜별로 쌓입니다.
          </p>
        ) : (
          groupByDay(reports).map(([day, items]) => (
            <div key={day} className="flex flex-col gap-2">
              <h3 className="font-semibold">{day}</h3>
              <ul className="flex flex-col gap-1">
                {items.map((report) => (
                  <li key={report.id}>
                    <Link
                      href={`/r/${report.id}`}
                      className="flex flex-wrap items-baseline gap-x-3 rounded-[10px] px-3 py-2 transition-colors hover:bg-white"
                    >
                      <span className="text-sm text-muted-foreground tabular-nums">
                        {TIME_FORMAT.format(new Date(report.createdAt))}
                      </span>
                      <span className="font-medium">
                        {report.title ??
                          (report.status === "completed"
                            ? "의사결정 보고서"
                            : "보고서를 만들고 있습니다")}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))
        )}
      </section>

      <section className="paper-card reveal-card flex flex-col gap-4 p-5 sm:p-6">
        <h2 className="text-xl font-semibold">팀원</h2>
        <ul className="flex flex-col gap-3">
          {team.members.map((member) => {
            const isSelf = member.userId === user.id;
            const canRemove = isCreator ? !isSelf : isSelf;
            return (
              <li
                key={member.userId}
                className="flex flex-wrap items-center justify-between gap-2"
              >
                <span>
                  <span className="font-medium">{member.name}</span>{" "}
                  <span className="text-sm break-all text-muted-foreground">
                    {member.email}
                  </span>
                </span>
                {canRemove && (
                  <RemoveMemberButton
                    teamId={team.id}
                    userId={member.userId}
                    isSelf={isSelf}
                  />
                )}
              </li>
            );
          })}
        </ul>
        <InviteLinkBox teamId={team.id} inviteToken={team.inviteToken} />
      </section>
    </>
  );
}

export default function TeamPage({ params }: PageProps<"/teams/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-4 py-12">
      <DotText text="MeetIQ" className="h-6 self-start text-primary" />
      <Suspense fallback={<p>팀을 불러오고 있습니다...</p>}>
        <TeamContent params={params} />
      </Suspense>
    </main>
  );
}
