import type { Metadata } from "next";
import { connection } from "next/server";
import { Suspense } from "react";

import { ReportView } from "@/components/report-view";
import { getReport, isValidJobId } from "@/lib/server/jobs";

export const metadata: Metadata = {
  title: "의사결정 보고서 | DecisionFlow",
};

async function ReportContent({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // 보고서는 캐시하지 않고 요청마다 읽는다.
  await connection();
  const report = isValidJobId(id) ? await getReport(id) : null;

  if (!report) {
    return <p>보고서를 찾을 수 없습니다. 삭제되었거나 기간이 지났을 수 있습니다.</p>;
  }
  return <ReportView report={report} />;
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
