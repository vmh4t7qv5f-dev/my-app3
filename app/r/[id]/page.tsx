import type { Metadata } from "next";
import Link from "next/link";
import { connection } from "next/server";
import { Suspense } from "react";

import { DeleteReportButton } from "@/components/delete-report-button";
import { DotText } from "@/components/dot-text";
import { JobWatcher } from "@/components/job-watcher";
import { ReportLinkBox } from "@/components/report-link-box";
import { ReportView } from "@/components/report-view";
import { buttonVariants } from "@/components/ui/button";
import { getJobState, getReport, isValidJobId } from "@/lib/server/jobs";
import { isUploadErrorCode, UPLOAD_ERROR_MESSAGES } from "@/lib/upload-rules";

// 링크가 유일한 접근 수단이므로 검색에 잡히거나 다른 사이트로 주소가 넘어가지 않게 한다.
export const metadata: Metadata = {
  title: "의사결정 보고서 | DecisionFlow",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

const NOT_FOUND_MESSAGE =
  "보고서를 찾을 수 없습니다. 삭제되었거나 30일이 지났거나 링크가 잘못되었을 수 있습니다.";

const PROGRESS_STEPS = [
  { status: "transcribing", label: "음성 변환" },
  { status: "analyzing", label: "내용 분석" },
  { status: "writing", label: "보고서 작성" },
];

function UploadLink({ children }: { children: string }) {
  return (
    <Link href="/" className={buttonVariants({ size: "lg", className: "self-start" })}>
      {children}
    </Link>
  );
}

function JobProgress({ id, status }: { id: string; status: string }) {
  const currentIndex = PROGRESS_STEPS.findIndex(
    (step) => step.status === status,
  );

  return (
    <div className="flex flex-col gap-6">
      <div
        role="status"
        className="glass-card glass-card--rose reveal-card flex flex-col gap-3 p-5"
      >
        <p className="font-semibold">보고서를 만들고 있습니다.</p>
        <ol className="flex flex-col gap-2">
          {PROGRESS_STEPS.map((step, index) => (
            <li
              key={step.status}
              aria-current={index === currentIndex ? "step" : undefined}
              className={
                index === currentIndex
                  ? "font-semibold"
                  : "text-white/85"
              }
            >
              {index + 1}. {step.label}
              {index < currentIndex && " (완료)"}
              {index === currentIndex && " (진행 중)"}
            </li>
          ))}
        </ol>
        <p className="text-sm leading-relaxed text-white/90">
          창을 닫아도 서버에서 계속 진행됩니다. 이 링크로 돌아오면 현재 상태를 볼 수
          있고, 끝나면 화면이 저절로 바뀝니다. 긴 음성은 10분 정도 걸릴 수 있습니다.
        </p>
      </div>
      <ReportLinkBox />
      <JobWatcher id={id} status={status} emailPending={false} />
    </div>
  );
}

async function ReportContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 보고서는 캐시하지 않고 요청마다 읽는다.
  await connection();

  const job = isValidJobId(id) ? await getJobState(id) : null;
  // 시작되지 않은 작업의 주소도 없는 링크처럼 다룬다.
  const report =
    job?.status === "completed" ? await getReport(id) : null;
  if (
    !job ||
    job.status === "pending" ||
    (job.status === "completed" && !report)
  ) {
    return (
      <div className="paper-card reveal-card flex flex-col gap-4 p-5">
        <p>{NOT_FOUND_MESSAGE}</p>
        <UploadLink>새 파일 올리기</UploadLink>
      </div>
    );
  }

  if (job.status === "failed") {
    return (
      <div className="paper-card reveal-card flex flex-col gap-4 p-5">
        <p role="alert">
          {isUploadErrorCode(job.errorCode)
            ? UPLOAD_ERROR_MESSAGES[job.errorCode]
            : UPLOAD_ERROR_MESSAGES.processing_failed}
        </p>
        <UploadLink>파일 다시 올리기</UploadLink>
      </div>
    );
  }

  if (!report) return <JobProgress id={id} status={job.status} />;

  return (
    <>
      <ReportLinkBox />
      {job.emailPending && (
        <>
          <p role="status" className="text-sm text-muted-foreground">
            입력한 수신자에게 보고서 메일을 보내고 있습니다.
          </p>
          <JobWatcher id={id} status={job.status} emailPending />
        </>
      )}
      {job.emailStatus === "sent" && (
        <p role="status" className="text-sm text-muted-foreground">
          입력한 수신자에게 보고서 메일을 보냈습니다.
        </p>
      )}
      {job.emailStatus === "failed" && (
        <p role="alert" className="text-sm text-destructive">
          보고서 메일을 보내지 못했습니다. 이 페이지의 링크를 직접 공유해 주세요.
        </p>
      )}
      <ReportView report={report} />
      <DeleteReportButton id={id} />
    </>
  );
}

export default function ReportPage({ params }: PageProps<"/r/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="reveal-text flex flex-col gap-3">
        <DotText text="DecisionFlow" className="h-6 self-start text-primary" />
        <h1 className="text-[clamp(24px,3.1vw,40px)] leading-[1.223] font-normal tracking-[0.015em] text-[#202020]">
          의사결정 보고서
        </h1>
      </header>
      <Suspense fallback={<p>보고서를 불러오고 있습니다...</p>}>
        <ReportContent params={params} />
      </Suspense>
    </main>
  );
}
