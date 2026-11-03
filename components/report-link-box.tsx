"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";

type CopyState = "idle" | "copied" | "failed";

const COPY_LABELS: Record<CopyState, string> = {
  idle: "링크 복사",
  copied: "복사했습니다",
  failed: "복사하지 못했습니다. 주소창의 링크를 직접 복사해 주세요",
};

// 로그인이 없어 링크가 유일한 접근 수단이므로 잃지 않도록 복사 버튼과 함께 안내한다.
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
    <div className="flex flex-col items-start gap-2 rounded-lg border border-border p-4 text-sm">
      <Button variant="outline" onClick={copyLink} aria-live="polite">
        {COPY_LABELS[copyState]}
      </Button>
      <p className="text-muted-foreground">
        이 링크를 잃으면 보고서를 되찾을 수 없습니다. 링크를 아는 사람은 누구나 볼
        수 있으니 공유에 주의해 주세요.
      </p>
    </div>
  );
}
