"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type CopyState = "idle" | "copied" | "failed";

const COPY_LABELS: Record<CopyState, string> = {
  idle: "링크 복사",
  copied: "복사했습니다",
  failed: "복사하지 못했습니다. 주소창의 링크를 직접 복사해 주세요",
};

// 팀원에게 보고서를 바로 전할 수 있도록 복사 버튼과 함께 누가 열 수 있는지 안내한다.
export function ReportLinkBox() {
  const [copyState, setCopyState] = useState<CopyState>("idle");

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <div className="flex flex-col items-start gap-2 paper-card p-4 text-sm">
      <Button variant="outline" onClick={copyLink} aria-live="polite">
        {COPY_LABELS[copyState]}
      </Button>
      <p className="text-muted-foreground">
        이 링크는 로그인한 팀원만 열 수 있습니다. 보고서는 팀 화면의 날짜별 목록에서도
        찾을 수 있습니다.
      </p>
    </div>
  );
}
