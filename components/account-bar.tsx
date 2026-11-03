import Link from "next/link";

import { Button, buttonVariants } from "@/components/ui/button";
import type { CurrentUser } from "@/lib/server/auth";
import type { Team } from "@/lib/server/teams";

// 로그인한 사람의 이름, 소속 팀으로 가는 링크, 로그아웃 버튼을 보여 준다.
export function AccountBar({
  user,
  teams,
}: {
  user: CurrentUser;
  teams: Team[];
}) {
  return (
    <nav
      aria-label="내 계정과 팀"
      className="flex flex-wrap items-center gap-2 text-sm"
    >
      <Link href="/" className={buttonVariants({ variant: "outline" })}>
        새 음성 올리기
      </Link>
      {teams.map((team) => (
        <Link
          key={team.id}
          href={`/teams/${team.id}`}
          className={buttonVariants({ variant: "outline" })}
        >
          {team.name}
        </Link>
      ))}
      <span className="ml-auto text-muted-foreground">{user.name}</span>
      <form action="/auth/logout" method="post">
        <Button type="submit" variant="ghost">
          로그아웃
        </Button>
      </form>
    </nav>
  );
}
