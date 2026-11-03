import "server-only";

import { createHash, randomBytes } from "node:crypto";

import { reportSchema, type Report } from "@/lib/report";

import { AUDIO_BUCKET, getSupabase } from "./supabase";

const JOB_ID_PATTERN = /^[A-Za-z0-9_-]{32}$/;
const DAILY_JOB_LIMIT = 5;

// 암호학적 난수 24바이트로 만들어 링크를 추측할 수 없게 한다.
function createJobId(): string {
  return randomBytes(24).toString("base64url");
}

export function isValidJobId(id: string): boolean {
  return JOB_ID_PATTERN.test(id);
}

export function getReportPath(id: string): string {
  return `/r/${id}`;
}

// 작업을 만들고 브라우저가 음성을 올릴 일회용 주소를 발급한다.
export async function createJob(
  teamId: string,
): Promise<{ id: string; uploadUrl: string }> {
  const supabase = getSupabase();
  const id = createJobId();

  const { error: insertError } = await supabase
    .from("jobs")
    .insert({ id, team_id: teamId });
  if (insertError) throw new Error("작업을 만들지 못했습니다.");

  const { data, error: signError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .createSignedUploadUrl(id);
  if (signError) {
    // 업로드 주소 없는 작업은 쓸 수 없으므로 되돌린다.
    await supabase.from("jobs").delete().eq("id", id);
    throw new Error("업로드 주소를 만들지 못했습니다.");
  }

  return { id, uploadUrl: data.signedUrl };
}

export async function isJobWaitingForStart(id: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .select("status")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("작업을 확인하지 못했습니다.");
  return data?.status === "pending";
}

export async function isAudioUploaded(id: string): Promise<boolean> {
  const { data } = await getSupabase().storage.from(AUDIO_BUCKET).exists(id);
  return data;
}

export async function downloadAudio(id: string): Promise<Blob> {
  const { data, error } = await getSupabase()
    .storage.from(AUDIO_BUCKET)
    .download(id);
  if (error) throw new Error("음성을 내려받지 못했습니다.");
  return data;
}

function hashRunToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export type StartJobResult =
  | { status: "started"; runToken: string }
  | { status: "not_pending" }
  | { status: "limit_reached" };

// 같은 음성을 두 번 변환해 비용을 쓰지 않도록 대기 중인 작업만 시작하고, 오늘 사용량을 함께 차감한다.
// 분석 단계를 부를 때 쓸 일회용 인증값을 돌려주며, DB에는 해시만 남긴다.
export async function startJob(
  id: string,
  recipientEmails: string[],
): Promise<StartJobResult> {
  const runToken = randomBytes(32).toString("base64url");
  const { data, error } = await getSupabase().rpc("start_job", {
    p_job_id: id,
    p_run_token_hash: hashRunToken(runToken),
    p_recipient_emails: recipientEmails.length > 0 ? recipientEmails : null,
  });
  if (error) throw new Error("작업 상태를 바꾸지 못했습니다.");
  if (data === "started") return { status: "started", runToken };
  return { status: data === "limit_reached" ? "limit_reached" : "not_pending" };
}

// 하루의 기준은 한국 시간 자정이다. 업로드 전에 미리 알려 주기 위한 확인이며, 실제 제한은 startJob이 지킨다.
export async function getRemainingJobsToday(): Promise<number> {
  const today = new Date().toLocaleDateString("sv-SE", {
    timeZone: "Asia/Seoul",
  });
  const { data, error } = await getSupabase()
    .from("daily_usage")
    .select("count")
    .eq("day", today)
    .maybeSingle();
  if (error) throw new Error("오늘 사용량을 확인하지 못했습니다.");
  return Math.max(DAILY_JOB_LIMIT - (data?.count ?? 0), 0);
}

export async function getRecipientEmails(id: string): Promise<string[]> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .select("recipient_emails")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("수신자를 확인하지 못했습니다.");
  return data?.recipient_emails ?? [];
}

export type EmailStatus = "sent" | "failed";

// 발송 결과만 남기고 수신자 주소는 바로 지운다.
export async function finishEmail(
  id: string,
  emailStatus: EmailStatus,
): Promise<void> {
  const { error } = await getSupabase()
    .from("jobs")
    .update({ email_status: emailStatus, recipient_emails: null })
    .eq("id", id);
  if (error) throw new Error("수신자 주소를 지우지 못했습니다.");
}

// 인증값이 맞으면 분석 상태로 바꾸고 인증값을 없앤다. 같은 값은 다시 쓸 수 없다.
export async function consumeRunToken(
  id: string,
  token: string,
): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .update({ status: "analyzing", run_token_hash: null })
    .eq("id", id)
    .eq("status", "transcribing")
    .eq("run_token_hash", hashRunToken(token))
    .select("id");
  if (error) throw new Error("작업 상태를 바꾸지 못했습니다.");
  return data.length > 0;
}

export async function markJobWriting(id: string): Promise<void> {
  const { error } = await getSupabase()
    .from("jobs")
    .update({ status: "writing" })
    .eq("id", id);
  if (error) throw new Error("작업 상태를 바꾸지 못했습니다.");
}

export type JobState = {
  status: string;
  errorCode: string | null;
  emailStatus: EmailStatus | null;
  emailPending: boolean;
  createdAt: string;
};

// 수신자 주소 자체는 돌려주지 않고 발송을 기다리는지만 알린다.
export async function getJobState(id: string): Promise<JobState | null> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .select("status, error_code, email_status, recipient_emails, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error("작업을 확인하지 못했습니다.");
  return (
    data && {
      status: data.status,
      errorCode: data.error_code,
      emailStatus: data.email_status,
      emailPending: (data.recipient_emails?.length ?? 0) > 0,
      createdAt: data.created_at,
    }
  );
}

// 실패한 작업은 오류 코드만 남기고 음성과 수신자 주소를 지운다. 음성 삭제가 실패해도 정리 기능이 나중에 지운다.
export async function failJob(id: string, errorCode: string): Promise<void> {
  const { error } = await getSupabase()
    .from("jobs")
    .update({
      status: "failed",
      error_code: errorCode,
      run_token_hash: null,
      recipient_emails: null,
    })
    .eq("id", id);
  await removeAudio(id).catch(() => undefined);
  if (error) throw new Error("작업 상태를 바꾸지 못했습니다.");
}

// 없거나 만료된 보고서는 null을 돌려준다. 정리 기능이 지우기 전이라도 만료되면 보이지 않는다.
// 팀 보고서는 만료일이 없어 직접 지울 때까지 보인다.
export async function getReport(id: string): Promise<Report | null> {
  const { data, error } = await getSupabase()
    .from("reports")
    .select("content")
    .eq("job_id", id)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .maybeSingle();
  if (error) throw new Error("보고서를 읽지 못했습니다.");
  if (!data) return null;

  // 검사 오류의 상세 내용이 로그에 남지 않도록 직접 문구를 정한다.
  const report = reportSchema.safeParse(data.content);
  if (!report.success) throw new Error("보고서 형식이 올바르지 않습니다.");
  return report.data;
}

async function removeAudio(id: string): Promise<void> {
  const { error } = await getSupabase()
    .storage.from(AUDIO_BUCKET)
    .remove([id]);
  if (error) throw new Error("음성을 지우지 못했습니다.");
}

// 검사에 걸렸거나 사용자가 삭제한 작업의 음성과 작업을 바로 지운다. 연결된 보고서도 함께 지워진다.
export async function discardJob(id: string): Promise<void> {
  await removeAudio(id);

  const { error } = await getSupabase().from("jobs").delete().eq("id", id);
  if (error) throw new Error("작업을 지우지 못했습니다.");
}

// 보고서를 저장한 뒤 음성을 지우고 작업을 완료로 표시한다.
export async function completeJob(id: string, report: Report): Promise<void> {
  const supabase = getSupabase();
  const { error: insertError } = await supabase
    .from("reports")
    .insert({ job_id: id, content: report });
  if (insertError) throw new Error("보고서를 저장하지 못했습니다.");

  // 보고서는 이미 저장됐으므로 음성 삭제가 실패해도 작업을 실패시키지 않는다.
  // 1회 다시 시도하고, 그래도 남으면 정리 기능이 업로드 후 23시간이 지나 지운다.
  await removeAudio(id).catch(() => removeAudio(id).catch(() => undefined));

  const { error: updateError } = await supabase
    .from("jobs")
    .update({ status: "completed" })
    .eq("id", id);
  if (updateError) throw new Error("작업 상태를 바꾸지 못했습니다.");
}
