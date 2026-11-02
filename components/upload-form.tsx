"use client";

import { useRef, useState, type DragEvent } from "react";

import { Button } from "@/components/ui/button";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import {
  CONTENT_TYPES_BY_EXTENSION,
  getFileExtension,
  isUploadErrorCode,
  MAX_DURATION_SECONDS,
  MAX_FILE_BYTES,
  UPLOAD_ERROR_MESSAGES,
  type UploadErrorCode,
} from "@/lib/upload-rules";

type UploadState =
  | { step: "idle" }
  | { step: "uploading"; percent: number }
  | { step: "done"; reportUrl: string };

const DURATION_READ_TIMEOUT_MS = 10_000;

function getContentType(file: File): string {
  return CONTENT_TYPES_BY_EXTENSION[getFileExtension(file.name)] ?? file.type;
}

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

// 브라우저가 길이를 읽지 못하면 null을 돌려준다.
function readDuration(file: File): Promise<number | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const audio = new Audio();
    const finish = (duration: number | null) => {
      clearTimeout(timer);
      URL.revokeObjectURL(url);
      resolve(duration);
    };
    const timer = setTimeout(() => finish(null), DURATION_READ_TIMEOUT_MS);
    audio.preload = "metadata";
    audio.onloadedmetadata = () =>
      finish(Number.isFinite(audio.duration) ? audio.duration : null);
    audio.onerror = () => finish(null);
    audio.src = url;
  });
}

// 업로드 전에 걸러 낼 수 있는 문제를 찾는다. 브라우저가 재생하지 못하는 정상 파일도
// 있으므로 손상 여부는 여기서 단정하지 않고 서버 검사에 맡긴다.
async function findFileProblem(file: File): Promise<UploadErrorCode | null> {
  if (!(getFileExtension(file.name) in CONTENT_TYPES_BY_EXTENSION)) {
    return "unsupported_format";
  }
  if (file.size === 0) return "empty_file";
  if (file.size > MAX_FILE_BYTES) return "too_large";

  const duration = await readDuration(file);
  return duration !== null && duration > MAX_DURATION_SECONDS
    ? "too_long"
    : null;
}

// 진행률을 받으려면 fetch가 아니라 XMLHttpRequest를 써야 한다.
function uploadFile(
  url: string,
  file: File,
  onProgress: (percent: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    request.onload = () =>
      request.status >= 200 && request.status < 300
        ? resolve()
        : reject(new Error("upload_failed"));
    request.onerror = () => reject(new Error("upload_failed"));
    request.open("PUT", url);
    request.setRequestHeader("content-type", getContentType(file));
    request.send(file);
  });
}

export function UploadForm() {
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>({ step: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const latestSelection = useRef(0);

  const isUploading = state.step === "uploading";

  async function selectFiles(files: FileList | null) {
    if (!files || files.length === 0 || isUploading) return;

    const selection = ++latestSelection.current;
    setFile(null);
    setState({ step: "idle" });

    if (files.length > 1) {
      setIsChecking(false);
      setError("파일은 한 번에 1개만 올릴 수 있습니다.");
      return;
    }

    setError(null);
    setIsChecking(true);
    const selected = files[0];
    const problem = await findFileProblem(selected);

    // 검사 중에 다른 파일을 고르면 이전 결과는 버린다.
    if (selection !== latestSelection.current) return;
    setIsChecking(false);
    if (problem) {
      setError(UPLOAD_ERROR_MESSAGES[problem]);
    } else {
      setFile(selected);
    }
  }

  function handleDrop(event: DragEvent<HTMLLabelElement>) {
    event.preventDefault();
    setIsDragging(false);
    void selectFiles(event.dataTransfer.files);
  }

  async function handleStart() {
    if (!file || isUploading) return;
    setError(null);
    setState({ step: "uploading", percent: 0 });

    try {
      const created = await fetch("/api/jobs", { method: "POST" });
      if (!created.ok) throw new Error("job_create_failed");
      const job: { id: string; uploadUrl: string } = await created.json();

      await uploadFile(job.uploadUrl, file, (percent) =>
        setState({ step: "uploading", percent }),
      );

      const started = await fetch(`/api/jobs/${job.id}/start`, {
        method: "POST",
      });
      if (!started.ok) {
        const { error: code }: { error?: string } = await started.json();
        throw new Error(code ?? "job_start_failed");
      }
      const { reportPath }: { reportPath: string } = await started.json();

      setState({
        step: "done",
        reportUrl: new URL(reportPath, window.location.origin).toString(),
      });
      setFile(null);
    } catch (cause) {
      const code = cause instanceof Error ? cause.message : "";
      setState({ step: "idle" });
      if (isUploadErrorCode(code)) {
        setFile(null);
        setError(UPLOAD_ERROR_MESSAGES[code]);
      } else {
        setError(
          "업로드하지 못했습니다. 인터넷 연결을 확인하고 다시 시도해 주세요.",
        );
      }
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed px-4 py-10 text-center transition-colors focus-within:border-ring hover:bg-muted ${
          isDragging ? "border-ring bg-muted" : "border-border"
        }`}
      >
        <input
          type="file"
          accept=".mp3,.m4a,.wav,audio/mpeg,audio/mp4,audio/wav"
          className="sr-only"
          disabled={isUploading}
          onChange={(event) => {
            void selectFiles(event.target.files);
            event.target.value = "";
          }}
        />
        {isChecking ? (
          <span className="font-medium">파일을 확인하고 있습니다...</span>
        ) : file ? (
          <>
            <span className="font-medium break-all">{file.name}</span>
            <span className="text-sm text-muted-foreground">
              {formatSize(file.size)} · 다른 파일을 고르려면 다시 누르세요
            </span>
          </>
        ) : (
          <>
            <span className="font-medium">
              파일을 끌어다 놓거나 눌러서 선택하세요
            </span>
            <span className="text-sm text-muted-foreground">
              mp3, m4a, wav 1개 / 최대 60분, 25MB
            </span>
          </>
        )}
      </label>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {state.step === "uploading" && (
        <Progress value={state.percent}>
          <ProgressLabel>업로드 중</ProgressLabel>
          <ProgressValue />
        </Progress>
      )}

      {state.step === "done" && (
        <div role="status" className="flex flex-col gap-1 rounded-lg bg-muted p-4">
          <p className="font-medium">업로드가 끝났습니다.</p>
          <p className="text-sm break-all">{state.reportUrl}</p>
          <p className="text-sm text-muted-foreground">
            분석과 보고서 화면은 아직 준비 중입니다.
          </p>
        </div>
      )}

      <section aria-label="업로드 전 안내" className="text-sm text-muted-foreground">
        <h2 className="mb-2 font-medium text-foreground">
          올리기 전에 확인해 주세요
        </h2>
        <ul className="flex list-disc flex-col gap-1 pl-5">
          <li>음성과 변환 텍스트는 분석을 위해 OpenAI로 전송됩니다.</li>
          <li>음성은 Supabase에 잠시 보관한 뒤 분석이 끝나면 바로 삭제합니다.</li>
          <li>보고서는 Supabase에 저장되며 30일 뒤 자동으로 삭제됩니다.</li>
          <li>
            공개 자료나 직접 만든 가상 회의 음성만 올려 주세요. 실제 회사의 내부
            회의나 대외비 음성은 올리지 마세요.
          </li>
        </ul>
      </section>

      <Button
        size="lg"
        className="w-full"
        disabled={!file || isUploading}
        onClick={handleStart}
      >
        {isUploading ? "업로드 중..." : "분석 시작"}
      </Button>
    </div>
  );
}
