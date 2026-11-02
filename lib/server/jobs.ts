import "server-only";

import { randomBytes } from "node:crypto";

import { AUDIO_BUCKET, getSupabase } from "./supabase";

const JOB_ID_PATTERN = /^[A-Za-z0-9_-]{32}$/;

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
export async function createJob(): Promise<{ id: string; uploadUrl: string }> {
  const supabase = getSupabase();
  const id = createJobId();

  const { error: insertError } = await supabase.from("jobs").insert({ id });
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

// 검사에 걸린 파일은 분석하지 않으므로 음성과 작업을 바로 지운다.
export async function discardJob(id: string): Promise<void> {
  const supabase = getSupabase();
  const { error: removeError } = await supabase.storage
    .from(AUDIO_BUCKET)
    .remove([id]);
  if (removeError) throw new Error("음성을 지우지 못했습니다.");

  const { error: deleteError } = await supabase
    .from("jobs")
    .delete()
    .eq("id", id);
  if (deleteError) throw new Error("작업을 지우지 못했습니다.");
}
