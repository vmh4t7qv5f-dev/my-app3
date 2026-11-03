import "server-only";

import type { Report } from "@/lib/report";

import { analyzeMeeting, generateAiSuggestions } from "./analyze";
import { sendReportEmail } from "./email";
import {
  completeJob,
  failJob,
  finishEmail,
  getRecipientEmails,
  getReportPath,
  markJobWriting,
  type EmailStatus,
} from "./jobs";
import {
  isTranscriptTooShort,
  transcribeAudio,
  type Transcript,
} from "./transcribe";

// 오류 내용에 회의 내용이 섞일 수 있으므로 오류 코드만 남긴다.
async function failSafely(id: string): Promise<void> {
  await failJob(id, "processing_failed").catch(() => undefined);
}

// 보고서는 이미 저장됐으므로 메일이 실패해도 작업을 실패시키지 않고 결과만 남긴다.
async function emailReport(
  id: string,
  report: Report,
  origin: string,
): Promise<void> {
  const recipients = await getRecipientEmails(id);
  if (recipients.length === 0) return;

  const reportUrl = `${origin}${getReportPath(id)}`;
  const emailStatus: EmailStatus = await sendReportEmail(
    recipients,
    report,
    reportUrl,
  ).then(
    () => "sent",
    () => "failed",
  );
  await finishEmail(id, emailStatus);
}

// 1단계: 음성을 변환해 분석 단계로 넘긴다. 변환 텍스트는 저장하지 않고 요청에 담아 넘긴다.
// 분석 단계는 바로 응답하므로 이 실행은 넘긴 뒤 끝나고, 분석은 자기 실행 시간을 새로 쓴다.
export async function runTranscribeStage(
  id: string,
  audio: Blob,
  runToken: string,
  origin: string,
): Promise<void> {
  try {
    const transcript = await transcribeAudio(audio);
    if (isTranscriptTooShort(transcript)) {
      await failJob(id, "too_little_speech");
      return;
    }

    const response = await fetch(`${origin}/api/jobs/${id}/analyze`, {
      method: "POST",
      headers: {
        authorization: `Bearer ${runToken}`,
        "content-type": "application/json",
      },
      body: JSON.stringify(transcript),
    });
    if (!response.ok) throw new Error("분석 단계를 시작하지 못했습니다.");
  } catch {
    await failSafely(id);
  }
}

// 2단계: 음성 내용을 분석하고 대안과 추천 결론을 만들어 보고서를 저장한다.
export async function runAnalyzeStage(
  id: string,
  transcript: Transcript,
  origin: string,
): Promise<void> {
  let report: Report;
  try {
    const analysis = await analyzeMeeting(transcript);
    if (!analysis) {
      await failJob(id, "no_analyzable_speech");
      return;
    }

    await markJobWriting(id);
    const suggestions = await generateAiSuggestions(transcript, analysis);
    report = { ...analysis, ...suggestions };
    await completeJob(id, report);
  } catch {
    await failSafely(id);
    return;
  }

  await emailReport(id, report, origin).catch(() => undefined);
}
