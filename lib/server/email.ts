import "server-only";

import nodemailer from "nodemailer";

import type { Report } from "@/lib/report";

import { getServerEnv } from "./env";
import { buildReportPdf } from "./report-pdf";

const MAX_ATTEMPTS = 2;
const CONNECTION_TIMEOUT_MS = 15_000;
const SUBJECT = "[DecisionFlow] 의사결정 보고서가 완성되었습니다";
const AI_NOTICE = "AI 분석은 틀릴 수 있습니다. 최종 판단은 반드시 사람이 해 주세요.";
const LINK_NOTICE =
  "링크는 30일 뒤 만료되며, 링크를 아는 사람은 누구나 보고 삭제할 수 있으니 공유에 주의해 주세요.";
const PDF_NOTICE =
  "보고서 전체를 PDF로 첨부했습니다. 발언 인용과 근거는 아래 링크에서 볼 수 있습니다.";
const PDF_NAME_TOPIC_MAX_LENGTH = 40;

type EmailBody = { text: string; html: string };

// 보고서 내용에는 AI 답변과 발언이 들어가므로 메일 HTML에 넣기 전에 바꿔 둔다.
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toTextList(items: string[], empty: string): string {
  return items.length === 0
    ? empty
    : items.map((item) => `- ${item}`).join("\n");
}

function toHtmlList(items: string[], empty: string): string {
  return items.length === 0
    ? `<p>${escapeHtml(empty)}</p>`
    : `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

// 받은 사람이 파일만 보고도 구분하도록 첫 번째 사안의 제목과 한국 날짜를 넣는다.
// 제목은 AI가 쓰므로 파일 이름에 쓸 수 없는 글자를 빼고 길이를 줄인다.
export function buildPdfFileName(report: Report, now: Date): string {
  const topic = Array.from(
    (report.topics[0]?.title ?? "")
      .replace(/[\\/:*?"<>|\p{Cc}]/gu, " ")
      .replace(/\s+/g, " ")
      .trim(),
  )
    .slice(0, PDF_NAME_TOPIC_MAX_LENGTH)
    .join("")
    .replace(/[\s.]+$/, "");
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Seoul",
  }).format(now);

  return ["의사결정 보고서", topic, date].filter(Boolean).join("_") + ".pdf";
}

// 본문에는 핵심 요약과 링크를 담는다. 나머지는 첨부 PDF와 링크에서 본다.
function buildEmailBody(
  report: Report,
  reportUrl: string,
  hasPdf: boolean,
): EmailBody {
  const source = report.isMeeting === false ? "대화" : "회의";
  const decisions = report.decisions.map((decision) => decision.content);
  const unresolved = report.unresolvedIssues.map(
    (issue) => `${issue.content} (이유: ${issue.reason})`,
  );
  const reasons = (report.finalConclusion?.reasons ?? []).map((reason) =>
    reason.hasAiEstimate ? `${reason.text} [AI 추정]` : reason.text,
  );
  const direction = report.finalConclusion?.direction ?? "";

  const decisionsTitle = `${source}에서 결정된 사항`;
  const unresolvedTitle = "미해결 문제";
  const conclusionTitle = "[AI 제안] AI 추천 결론";
  const conclusionNotice = `${source}에서 합의된 결론이 아니라 AI가 추천하는 방향입니다.`;

  const text = [
    AI_NOTICE,
    `■ ${decisionsTitle}\n${toTextList(decisions, "합의된 결론 없음")}`,
    `■ ${unresolvedTitle}\n${toTextList(unresolved, "미해결 문제 없음")}`,
    `■ ${conclusionTitle}\n${conclusionNotice}\n${direction}\n추천 이유\n${toTextList(reasons, "")}`,
    ...(hasPdf ? [PDF_NOTICE] : []),
    `전체 보고서 보기: ${reportUrl}\n${LINK_NOTICE}`,
  ].join("\n\n");

  const html = [
    `<p><strong>${escapeHtml(AI_NOTICE)}</strong></p>`,
    `<h2>${escapeHtml(decisionsTitle)}</h2>`,
    toHtmlList(decisions, "합의된 결론 없음"),
    `<h2>${escapeHtml(unresolvedTitle)}</h2>`,
    toHtmlList(unresolved, "미해결 문제 없음"),
    `<h2>${escapeHtml(conclusionTitle)}</h2>`,
    `<p>${escapeHtml(conclusionNotice)}</p>`,
    `<p>${escapeHtml(direction)}</p>`,
    `<p>추천 이유</p>`,
    toHtmlList(reasons, ""),
    hasPdf ? `<p>${escapeHtml(PDF_NOTICE)}</p>` : "",
    `<p><a href="${escapeHtml(reportUrl)}">전체 보고서 보기</a></p>`,
    `<p>${escapeHtml(LINK_NOTICE)}</p>`,
  ].join("");

  return { text, html };
}

// 수신자끼리 서로의 주소를 볼 수 없도록 숨은 참조로 보낸다.
// 실패하면 1회만 다시 시도한다. 오류에 주소와 내용이 섞일 수 있어 로그에 남기지 않는다.
export async function sendReportEmail(
  recipients: string[],
  report: Report,
  reportUrl: string,
): Promise<void> {
  const user = getServerEnv("GMAIL_USER");
  const transport = nodemailer.createTransport({
    service: "gmail",
    auth: { user, pass: getServerEnv("GMAIL_APP_PASSWORD") },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
  });

  // PDF를 만들지 못해도 요약과 링크는 전달되도록 첨부 없이 보낸다.
  const pdf = await buildReportPdf(report).catch(() => null);

  const message = {
    from: { name: "DecisionFlow", address: user },
    to: user,
    bcc: recipients,
    subject: SUBJECT,
    ...buildEmailBody(report, reportUrl, pdf !== null),
    attachments: pdf
      ? [
          {
            filename: buildPdfFileName(report, new Date()),
            content: pdf,
            contentType: "application/pdf",
          },
        ]
      : [],
  };

  for (let attempt = 1; ; attempt++) {
    try {
      await transport.sendMail(message);
      return;
    } catch {
      if (attempt >= MAX_ATTEMPTS) {
        throw new Error("보고서 메일을 보내지 못했습니다.");
      }
    }
  }
}
