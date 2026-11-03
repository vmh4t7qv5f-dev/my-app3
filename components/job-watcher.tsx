"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const CHECK_INTERVAL_MS = 5_000;

// 작업 상태를 주기적으로 확인하고, 바뀌면 화면을 새로 그린다. 인터넷이 잠시 끊겨도 계속 확인한다.
export function JobWatcher({
  id,
  status,
  emailPending,
}: {
  id: string;
  status: string;
  emailPending: boolean;
}) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    let isStopped = false;

    async function check() {
      try {
        const response = await fetch(`/api/jobs/${id}`, { cache: "no-store" });
        if (response.status === 404) {
          router.refresh();
        } else if (response.ok) {
          const job: { status: string; emailPending: boolean } =
            await response.json();
          if (job.status !== status || job.emailPending !== emailPending) {
            router.refresh();
          }
        }
      } catch {
        // 다음 확인에서 다시 시도한다.
      }
      if (!isStopped) timer = setTimeout(check, CHECK_INTERVAL_MS);
    }

    timer = setTimeout(check, CHECK_INTERVAL_MS);
    return () => {
      isStopped = true;
      clearTimeout(timer);
    };
  }, [id, status, emailPending, router]);

  return null;
}
