import "server-only";

import { discardJob, failJob } from "./jobs";
import { AUDIO_BUCKET, getSupabase } from "./supabase";

const HOUR_MS = 60 * 60 * 1000;
// 실행 한 번은 최대 5분이므로 이만큼 단계가 바뀌지 않으면 강제로 끊긴 것으로 본다.
const STUCK_AFTER_MS = 15 * 60 * 1000;
// 매시간 실행해도 24시간 안에 지우도록 23시간을 기준으로 한다.
const AUDIO_MAX_AGE_MS = 23 * HOUR_MS;
const JOB_MAX_AGE_MS = 30 * 24 * HOUR_MS;
const RUNNING_STATUSES = ["transcribing", "analyzing", "writing"];
const MAX_AUDIO_PER_RUN = 1000;

function timeAgo(ms: number): string {
  return new Date(Date.now() - ms).toISOString();
}

// 강제로 끊긴 작업을 실패로 표시한다. 음성과 수신자 주소도 함께 지워진다.
async function failStuckJobs(): Promise<number> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .select("id")
    .in("status", RUNNING_STATUSES)
    .lt("updated_at", timeAgo(STUCK_AFTER_MS));
  if (error) throw new Error("멈춘 작업을 찾지 못했습니다.");

  for (const { id } of data) await failJob(id, "processing_failed");
  return data.length;
}

// 보고서 저장 뒤 발송 중에 끊긴 작업은 발송 실패로 표시하고 주소를 지운다.
async function clearStuckRecipients(): Promise<number> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .update({ email_status: "failed", recipient_emails: null })
    .eq("status", "completed")
    .not("recipient_emails", "is", null)
    .lt("updated_at", timeAgo(STUCK_AFTER_MS))
    .select("id");
  if (error) throw new Error("남은 수신자 주소를 지우지 못했습니다.");
  return data.length;
}

// 업로드만 하고 시작하지 않은 작업을 음성과 함께 지운다.
async function discardAbandonedJobs(): Promise<number> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .select("id")
    .eq("status", "pending")
    .lt("created_at", timeAgo(AUDIO_MAX_AGE_MS));
  if (error) throw new Error("시작되지 않은 작업을 찾지 못했습니다.");

  for (const { id } of data) await discardJob(id);
  return data.length;
}

// 어떤 이유로든 남은 음성을 지운다. 파일 이름에는 작업 고유 값만 있다.
async function removeOldAudio(): Promise<number> {
  const storage = getSupabase().storage.from(AUDIO_BUCKET);
  const { data, error } = await storage.list("", {
    limit: MAX_AUDIO_PER_RUN,
    sortBy: { column: "created_at", order: "asc" },
  });
  if (error) throw new Error("남은 음성을 찾지 못했습니다.");

  const threshold = Date.now() - AUDIO_MAX_AGE_MS;
  const names = data
    .filter(
      (file) => file.created_at && Date.parse(file.created_at) < threshold,
    )
    .map((file) => file.name);
  if (names.length === 0) return 0;

  const { error: removeError } = await storage.remove(names);
  if (removeError) throw new Error("남은 음성을 지우지 못했습니다.");
  return names.length;
}

// 작업을 지우면 연결된 보고서도 함께 지워진다.
async function deleteExpiredReports(): Promise<number> {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from("reports")
    .select("job_id")
    .lt("expires_at", new Date().toISOString());
  if (error) throw new Error("만료된 보고서를 찾지 못했습니다.");
  if (data.length === 0) return 0;

  const { error: deleteError } = await supabase
    .from("jobs")
    .delete()
    .in(
      "id",
      data.map((report) => report.job_id),
    );
  if (deleteError) throw new Error("만료된 보고서를 지우지 못했습니다.");
  return data.length;
}

// 보고서가 없는 실패 작업은 만료일이 없으므로 같은 기간이 지나면 지운다.
async function deleteOldFailedJobs(): Promise<number> {
  const { data, error } = await getSupabase()
    .from("jobs")
    .delete()
    .eq("status", "failed")
    .lt("created_at", timeAgo(JOB_MAX_AGE_MS))
    .select("id");
  if (error) throw new Error("오래된 실패 작업을 지우지 못했습니다.");
  return data.length;
}

// 건수만 돌려준다. 멈춘 작업을 먼저 처리해야 그 음성도 함께 지워진다.
export async function runCleanup() {
  return {
    stuckJobs: await failStuckJobs(),
    stuckRecipients: await clearStuckRecipients(),
    abandonedJobs: await discardAbandonedJobs(),
    oldAudio: await removeOldAudio(),
    expiredReports: await deleteExpiredReports(),
    oldFailedJobs: await deleteOldFailedJobs(),
  };
}
