import { Button } from "@/components/ui/button";

// 업로드 화면을 만들기 전까지 쓰는 임시 화면이다.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-3xl font-semibold">DecisionFlow</h1>
      <p className="text-muted-foreground">
        회의 음성을 올리면 의사결정 보고서를 만듭니다.
      </p>
      <Button disabled>업로드 화면 준비 중</Button>
    </main>
  );
}
