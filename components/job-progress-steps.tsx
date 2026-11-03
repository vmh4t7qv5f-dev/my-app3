"use client";

import { useEffect, useState } from "react";

import { DotText } from "@/components/dot-text";

const SECOND_MS = 1000;

function formatElapsed(ms: number): string {
  const seconds = Math.max(Math.floor(ms / SECOND_MS), 0);
  const rest = String(seconds % 60).padStart(2, "0");
  return `${Math.floor(seconds / 60)}분 ${rest}초`;
}

// 외부 서비스가 퍼센트를 알려 주지 않아 숫자를 지어내지 않고, 실제 단계와 경과 시간만 보여 준다.
export function JobProgressSteps({
  steps,
  currentIndex,
  startedAt,
}: {
  steps: string[];
  currentIndex: number;
  startedAt: string;
}) {
  // 서버와 첫 화면이 어긋나지 않도록 브라우저에 그려진 뒤부터 시간을 센다.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), SECOND_MS);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <p className="flex items-center gap-2 font-semibold">
          <DotText text={String(currentIndex + 1)} className="h-7" />
          <span>
            / {steps.length}단계 · {steps[currentIndex]} 중
          </span>
        </p>
        <p className="text-sm text-white/90 tabular-nums">
          {now === null
            ? "경과 시간 확인 중"
            : `경과 ${formatElapsed(now - Date.parse(startedAt))}`}
        </p>
      </div>

      <ol
        role="progressbar"
        aria-label="보고서 만들기 진행 단계"
        aria-valuemin={0}
        aria-valuemax={steps.length}
        aria-valuenow={currentIndex}
        aria-valuetext={`${steps.length}단계 중 ${currentIndex + 1}단계, ${steps[currentIndex]} 진행 중`}
        className="grid gap-2 sm:grid-cols-3"
      >
        {steps.map((step, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <li
              key={step}
              aria-current={isCurrent ? "step" : undefined}
              className="flex flex-col gap-1.5"
            >
              <span
                className={`relative block h-2.5 overflow-hidden rounded-full ${
                  isDone ? "bg-white" : "bg-white/25"
                }`}
              >
                {isCurrent && <span className="progress-shimmer" />}
              </span>
              <span
                className={`flex justify-between gap-2 text-sm ${
                  isCurrent ? "font-semibold" : "text-white/85"
                }`}
              >
                <span>{step}</span>
                <span>
                  {isDone ? "완료" : isCurrent ? "진행 중" : "대기"}
                </span>
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
