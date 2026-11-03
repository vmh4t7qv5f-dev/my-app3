"use client";

import { useRouter } from "next/navigation";
import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type DragEvent,
} from "react";

import { DotText } from "@/components/dot-text";
import { Button } from "@/components/ui/button";
import {
  Progress,
  ProgressLabel,
  ProgressValue,
} from "@/components/ui/progress";
import { compressAudio } from "@/lib/compress-audio";
import {
  CONTENT_TYPES_BY_EXTENSION,
  getFileExtension,
  isTooLong,
  isUploadErrorCode,
  MAX_FILE_BYTES,
  MAX_ORIGINAL_FILE_BYTES,
  MAX_RECIPIENTS,
  parseRecipientText,
  UPLOAD_ERROR_MESSAGES,
  type UploadErrorCode,
} from "@/lib/upload-rules";

type UploadState =
  | { step: "idle" }
  | { step: "compressing"; percent: number }
  | { step: "uploading"; percent: number }
  | { step: "checking" };

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
  if (file.size > MAX_ORIGINAL_FILE_BYTES) return "original_too_large";

  const duration = await readDuration(file);
  return duration !== null && isTooLong(duration) ? "too_long" : null;
}

// 작은 파일은 음질을 지키도록 그대로 올리고, 25MB가 넘을 때만 줄인다.
async function prepareUpload(
  file: File,
  onProgress: (percent: number) => void,
): Promise<File> {
  if (file.size <= MAX_FILE_BYTES) return file;

  let compressed: File;
  try {
    compressed = await compressAudio(file, onProgress);
  } catch {
    throw new Error("compression_failed");
  }
  // 길이를 미리 읽지 못한 파일은 줄인 뒤에도 크면 60분을 넘는 음성이다.
  if (compressed.size > MAX_FILE_BYTES) throw new Error("too_long");
  return compressed;
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

export function UploadForm({
  teams,
  isGuest = false,
}: {
  teams: { id: string; name: string }[];
  isGuest?: boolean;
}) {
  const router = useRouter();
  const [teamId, setTeamId] = useState(teams[0].id);
  const [file, setFile] = useState<File | null>(null);
  const [state, setState] = useState<UploadState>({ step: "idle" });
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [recipientText, setRecipientText] = useState("");
  const [hasConsent, setHasConsent] = useState(false);
  const [remainingToday, setRemainingToday] = useState<number | null>(null);
  const latestSelection = useRef(0);

  // 건수를 읽지 못해도 올릴 수 있게 둔다. 실제 제한은 서버가 지킨다.
  useEffect(() => {
    fetch("/api/usage", { cache: "no-store" })
      .then((response) => (response.ok ? response.json() : null))
      .then((usage: { remaining: number } | null) =>
        setRemainingToday(usage?.remaining ?? null),
      )
      .catch(() => undefined);
  }, []);

  const isUploading =
    state.step === "compressing" ||
    state.step === "uploading" ||
    state.step === "checking";

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

    // 올리기 전에 확인해 파일을 다시 고르지 않아도 주소만 고칠 수 있게 한다.
    const recipientEmails = parseRecipientText(recipientText);
    if (!recipientEmails || (recipientEmails.length > 0 && !hasConsent)) {
      setError(UPLOAD_ERROR_MESSAGES.invalid_recipients);
      return;
    }

    setError(null);
    setState({ step: "compressing", percent: 0 });

    try {
      const uploadable = await prepareUpload(file, (percent) =>
        setState({ step: "compressing", percent }),
      );

      setState({ step: "uploading", percent: 0 });
      const created = await fetch("/api/jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId }),
      });
      if (!created.ok) {
        const { error: code }: { error?: string } = await created.json();
        throw new Error(code ?? "job_create_failed");
      }
      const job: { id: string; uploadUrl: string } = await created.json();

      await uploadFile(job.uploadUrl, uploadable, (percent) =>
        setState({ step: "uploading", percent }),
      );

      setState({ step: "checking" });
      const started = await fetch(`/api/jobs/${job.id}/start`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ recipientEmails, consent: hasConsent }),
      });
      if (!started.ok) {
        const { error: code }: { error?: string } = await started.json();
        throw new Error(code ?? "job_start_failed");
      }
      const { reportPath }: { reportPath: string } = await started.json();

      router.push(reportPath);
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
      <div className="paper-card flex flex-wrap items-center gap-3 p-4">
        <label htmlFor="upload-team" className="font-semibold">
          저장할 팀
        </label>
        <select
          id="upload-team"
          value={teamId}
          disabled={isUploading}
          onChange={(event) => setTeamId(event.target.value)}
          className="h-9 max-w-full rounded-[10px] border border-input bg-white px-3 text-sm"
        >
          {teams.map((team) => (
            <option key={team.id} value={team.id}>
              {team.name}
            </option>
          ))}
        </select>
      </div>
      <div
        className={`grid gap-[clamp(8px,1.5vw,23px)] ${
          isGuest ? "lg:grid-cols-2" : "lg:grid-cols-3"
        }`}
      >
      <div
        className="glass-card glass-card--rose reveal-card flex min-h-80 flex-col gap-4 p-5"
        style={{ "--reveal-delay": "0.25s" } as CSSProperties}
      >
      <label
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`flex flex-1 cursor-pointer flex-col items-center justify-center gap-2 rounded-[10px] border-2 border-dashed px-4 py-10 text-center transition-colors focus-within:border-white hover:bg-white/10 ${
          isDragging ? "border-white bg-white/10" : "border-white/50"
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
            <span className="text-sm text-white/90">
              {formatSize(file.size)} · 다른 파일을 고르려면 다시 누르세요
            </span>
            {file.size > MAX_FILE_BYTES && (
              <span className="text-sm text-white/90">
                25MB가 넘어 이 브라우저에서 자동으로 줄인 뒤 올립니다
              </span>
            )}
          </>
        ) : (
          <>
            <span className="font-medium">
              파일을 끌어다 놓거나 눌러서 선택하세요
            </span>
            <span className="text-sm text-white/90">
              mp3, m4a, wav 1개 / 최대 60분 / 25MB가 넘으면 자동으로 줄여서 올립니다
            </span>
          </>
        )}
      </label>

      {error && (
        <p role="alert" className="card-inset text-sm text-destructive">
          {error}
        </p>
      )}

      {state.step === "compressing" && (
        <div className="card-inset">
          <Progress value={state.percent}>
            <ProgressLabel>파일 줄이는 중 (창을 닫지 마세요)</ProgressLabel>
            <ProgressValue />
          </Progress>
        </div>
      )}

      {state.step === "uploading" && (
        <div className="card-inset">
          <Progress value={state.percent}>
            <ProgressLabel>업로드 중</ProgressLabel>
            <ProgressValue />
          </Progress>
        </div>
      )}

      {state.step === "checking" && (
        <p role="status" className="card-inset text-sm font-medium">
          올린 파일을 확인하고 있습니다.
        </p>
      )}
      </div>

      {!isGuest && (
      <div
        className="glass-card glass-card--violet reveal-card flex flex-col gap-3 p-5"
        style={{ "--reveal-delay": "0.37s" } as CSSProperties}
      >
        <label htmlFor="recipient-emails" className="font-semibold">
          보고서를 메일로 받을 사람 (선택, 최대 {MAX_RECIPIENTS}명)
        </label>
        <textarea
          id="recipient-emails"
          rows={4}
          value={recipientText}
          disabled={isUploading}
          onChange={(event) => setRecipientText(event.target.value)}
          placeholder="a@example.com, b@example.com"
          className="rounded-[10px] border border-white/60 bg-white/95 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground"
        />
        <p className="text-sm leading-relaxed text-white/90">
          분석이 끝나면 핵심 요약과 보고서 링크, 보고서 PDF를 자동으로 보냅니다. 창을
          닫아도 발송됩니다.
        </p>
        {recipientText.trim() && (
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={hasConsent}
              disabled={isUploading}
              onChange={(event) => setHasConsent(event.target.checked)}
            />
            <span>수신자 모두가 이 보고서를 메일로 받는 데 동의했습니다.</span>
          </label>
        )}
      </div>
      )}

      <section
        aria-label="업로드 전 안내"
        className="glass-card glass-card--orange reveal-card p-5 text-sm leading-relaxed"
        style={{ "--reveal-delay": "0.49s" } as CSSProperties}
      >
        <h2 className="mb-3 text-base font-semibold">
          올리기 전에 확인해 주세요
        </h2>
        <ul className="flex list-disc flex-col gap-1.5 pl-5">
          <li>음성과 변환 텍스트는 분석을 위해 OpenAI로 전송됩니다.</li>
          <li>음성은 Supabase에 잠시 보관한 뒤 분석이 끝나면 바로 삭제합니다.</li>
          {isGuest ? (
            <li>보고서는 Supabase에 저장되며, 30일 뒤 자동으로 삭제됩니다.</li>
          ) : (
            <>
              <li>
                보고서는 Supabase에 저장되며, 팀원이 직접 삭제할 때까지 팀에 보관됩니다.
                팀원은 누구나 보고 삭제할 수 있습니다.
              </li>
              <li>
                입력한 이메일 주소는 발송을 위해 Supabase에 잠시 보관되고 Gmail로
                전송되며, 발송하거나 분석이 실패하면 바로 삭제합니다. 메일로 보낸
                내용과 PDF는 받는 사람의 메일함에 남습니다.
              </li>
            </>
          )}
          <li>
            공개 자료나 직접 만든 가상 음성만 올려 주세요. 실제 회사의 내부 회의,
            대외비 음성, 상대방 동의 없이 녹음한 대화는 올리지 마세요.
          </li>
        </ul>
      </section>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-end">
      {remainingToday === 0 && (
        <p role="alert" className="text-sm text-destructive sm:mr-auto">
          {UPLOAD_ERROR_MESSAGES.daily_limit}
        </p>
      )}
      {remainingToday !== null && remainingToday > 0 && (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          오늘 남은 처리:
          <DotText
            text={String(remainingToday)}
            className="h-5 text-primary"
          />
          건
        </p>
      )}

      <Button
        size="lg"
        className="w-full sm:w-64"
        disabled={!file || isUploading || remainingToday === 0}
        onClick={handleStart}
      >
        {state.step === "compressing"
          ? "파일 줄이는 중..."
          : state.step === "uploading"
          ? "업로드 중..."
          : state.step === "checking"
            ? "파일 확인 중..."
            : "분석 시작"}
      </Button>
      </div>
    </div>
  );
}
