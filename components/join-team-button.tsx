"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

export function JoinTeamButton({ token }: { token: string }) {
  const router = useRouter();
  const [isJoining, setIsJoining] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  async function join() {
    setIsJoining(true);
    setHasFailed(false);
    try {
      const response = await fetch(`/api/invites/${token}`, { method: "POST" });
      if (!response.ok) throw new Error("team_join_failed");
      const { teamId }: { teamId: string } = await response.json();
      router.push(`/teams/${teamId}`);
    } catch {
      setHasFailed(true);
      setIsJoining(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button size="lg" disabled={isJoining} onClick={join}>
        {isJoining ? "참여하는 중..." : "팀 참여하기"}
      </Button>
      {hasFailed && (
        <p role="alert" className="text-sm text-destructive">
          팀에 참여하지 못했습니다. 초대 링크를 확인하고 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}
