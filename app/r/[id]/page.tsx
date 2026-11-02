import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { ReportView } from "@/components/report-view";
import { getJobState, getReport, isValidJobId } from "@/lib/server/jobs";
import { isUploadErrorCode, UPLOAD_ERROR_MESSAGES } from "@/lib/upload-rules";

export const metadata: Metadata = {
  title: "의사결정 보고서 | DecisionFlow",
};

const NOT_FOUND_MESSAGE =
  "보고서를 찾을 수 없습니다. 삭제되었거나 기간이 지났을 수 있습니다.";

async function ReportContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 보고서는 캐시하지 않고 요청마다 읽는다.
  await connection();

  const job = isValidJobId(id) ? await getJobState(id) : null;
  // 시작되지 않은 작업의 주소도 없는 링크처럼 다룬다.
  if (!job || job.status === "pending") return <p>{NOT_FOUND_MESSAGE}</p>;

  if (job.status === "failed") {
    return (
      <p role="alert">
        {isUploadErrorCode(job.errorCode)
          ? UPLOAD_ERROR_MESSAGES[job.errorCode]
          : UPLOAD_ERROR_MESSAGES.processing_failed}
      </p>
    );
  }
  if (job.status !== "completed") {
    return <p>보고서를 만들고 있습니다. 잠시 뒤 새로고침해 주세요.</p>;
  }

  const report = await getReport(id);
  return report ? <ReportView report={report} /> : <p>{NOT_FOUND_MESSAGE}</p>;
}

export default function ReportPage({ params }: PageProps<"/r/[id]">) {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-8 px-4 py-12">
      <h1 className="text-3xl font-semibold">의사결정 보고서</h1>
      <Suspense fallback={<p>보고서를 불러오고 있습니다...</p>}>
        <ReportContent params={params} />
      </Suspense>
    </main>
  );
}
