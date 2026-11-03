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

// 스스로 나가면 팀 보고서를 볼 수 없게 되므로 첫 화면으로 돌아간다.
export function RemoveMemberButton({
  teamId,
  userId,
  isSelf,
}: {
  teamId: string;
  userId: string;
  isSelf: boolean;
}) {
  const router = useRouter();
  const [hasFailed, setHasFailed] = useState(false);
  const label = isSelf ? "팀 나가기" : "내보내기";

  async function remove() {
    setHasFailed(false);
    try {
      const response = await fetch(`/api/teams/${teamId}/members/${userId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("member_remove_failed");
      if (isSelf) router.push("/");
      else router.refresh();
    } catch {
      setHasFailed(true);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <AlertDialog>
        <AlertDialogTrigger render={<Button variant="destructive" />}>
          {label}
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{label} 할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              팀에서 빠지면 이 팀의 보고서를 볼 수 없습니다. 초대 링크로 다시 참여할
              수 있으니, 필요하면 초대 링크도 새로 만들어 주세요.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={remove}>
              {label}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      {hasFailed && (
        <p role="alert" className="text-sm text-destructive">
          처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.
        </p>
      )}
    </div>
  );
}
