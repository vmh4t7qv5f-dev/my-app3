"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

// 팀원은 누구나 삭제할 수 있고 되돌릴 수 없으므로 확인 창을 거친다.
export function DeleteReportButton({ id }: { id: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasFailed, setHasFailed] = useState(false);

  async function deleteReport() {
    setIsDeleting(true);
    setHasFailed(false);
    try {
      const response = await fetch(`/api/jobs/${id}`, { method: "DELETE" });
      if (!response.ok && response.status !== 404) {
        throw new Error("delete_failed");
      }
      router.refresh();
    } catch {
      setHasFailed(true);
      setIsDeleting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <AlertDialog>
        <AlertDialogTrigger
          render={<Button variant="destructive" disabled={isDeleting} />}
        >
          {isDeleting ? "삭제하는 중..." : "보고서 삭제"}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>보고서를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              삭제하면 되돌릴 수 없고, 모든 팀원이 더 이상 볼 수 없습니다. 이미 보낸
              메일은 지워지지 않습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={deleteReport}>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {hasFailed && (
        <p role="alert" className="text-sm text-destructive">
          보고서를 삭제하지 못했습니다. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}
