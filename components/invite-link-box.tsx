"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";

type CopyState = "idle" | "copied" | "failed";

const COPY_LABELS: Record<CopyState, string> = {
  idle: "초대 링크 복사",
  copied: "복사했습니다",
  failed: "복사하지 못했습니다",
};

// 초대 링크를 아는 사람은 구글로 로그인해 팀원이 될 수 있으므로, 새어 나가면 바꿀 수 있게 한다.
export function InviteLinkBox({
  teamId,
  inviteToken,
}: {
  teamId: string;
  inviteToken: string;
}) {
  const router = useRouter();
  const [copyState, setCopyState] = useState<CopyState>("idle");
  const [isResetting, setIsResetting] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(
        `${window.location.origin}/invite/${inviteToken}`,
      );
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  async function resetLink() {
    setIsResetting(true);
    setHasFailed(false);
    try {
      const response = await fetch(`/api/teams/${teamId}/invite`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("invite_reset_failed");
      setCopyState("idle");
      router.refresh();
    } catch {
      setHasFailed(true);
    }
    setIsResetting(false);
  }

  return (
    <div className="flex flex-col items-start gap-2 text-sm">
      <div className="flex flex-wrap gap-2">
        <Button onClick={copyLink} aria-live="polite">
          {COPY_LABELS[copyState]}
        </Button>
        <Button variant="outline" disabled={isResetting} onClick={resetLink}>
          {isResetting ? "새로 만드는 중..." : "초대 링크 새로 만들기"}
        </Button>
      </div>
      <p className="text-muted-foreground">
        이 링크를 받은 사람은 구글로 로그인해 팀원이 되고, 팀의 보고서를 보고 삭제할 수
        있습니다. 새로 만들면 이전 링크로는 참여할 수 없습니다.
      </p>
      {hasFailed && (
        <p role="alert" className="text-destructive">
          초대 링크를 새로 만들지 못했습니다. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}
