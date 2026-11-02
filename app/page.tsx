import { UploadForm } from "@/components/upload-form";

export default function Home() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col gap-8 px-4 py-12">
      <header className="flex flex-col gap-2">
        <h1 className="text-3xl font-semibold">DecisionFlow</h1>
        <p className="text-muted-foreground">
          회의 음성을 올리면 결정 사항, 미해결 문제, AI 제안을 구분한 의사결정
          보고서를 만듭니다.
        </p>
      </header>
      <UploadForm />
    </main>
  );
}
