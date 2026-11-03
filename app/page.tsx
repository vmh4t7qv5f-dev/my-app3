import type { CSSProperties } from "react";

import { DotText } from "@/components/dot-text";
import { UploadForm } from "@/components/upload-form";

export default function Home() {
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
      <UploadForm />
    </main>
  );
}
