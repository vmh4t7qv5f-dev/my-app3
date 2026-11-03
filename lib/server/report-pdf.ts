import "server-only";

import path from "node:path";

import PDFDocument from "pdfkit";

import type { Report } from "@/lib/report";

const FONT_DIR = path.join(process.cwd(), "assets", "fonts");
const REGULAR_FONT = path.join(FONT_DIR, "Pretendard-Regular.ttf");
const BOLD_FONT = path.join(FONT_DIR, "Pretendard-Bold.ttf");

const MARGIN = 50;
const BULLET_INDENT = 12;
const MIN_SPACE_BELOW = 60;
const TEXT_COLOR = "#1f2937";
const MUTED_COLOR = "#6b7280";
const AI_COLOR = "#5b21b6";
const AI_BACKGROUND = "#f5f3ff";

type Point = Report["alternatives"][number]["risks"][number];
type ProsConsPoint = Report["topics"][number]["solutions"][number]["pros"][number];

function formatPoint(point: Point): string {
  return point.hasAiEstimate ? `${point.text} [AI 추정]` : point.text;
}

function formatProsConsPoint(point: ProsConsPoint): string {
  const label = point.mentionedInMeeting ? "" : " [AI 분석]";
  return `${formatPoint(point)}${label}`;
}

// 메일로 나간 파일은 지울 수 없으므로 발언 인용과 보고서 링크는 넣지 않는다.
export function buildReportPdf(report: Report): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({
      size: "A4",
      margin: MARGIN,
      bufferPages: true,
      font: REGULAR_FONT,
      info: { Title: "의사결정 보고서", Creator: "DecisionFlow" },
    });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const width = doc.page.width - MARGIN * 2;
    const source = report.isMeeting === false ? "대화" : "회의";

    const keepOnPage = () => {
      if (doc.y > doc.page.height - MARGIN - MIN_SPACE_BELOW) doc.addPage();
    };
    const write = (
      text: string,
      { font = REGULAR_FONT, size = 10.5, color = TEXT_COLOR, gap = 4 } = {},
    ) => {
      keepOnPage();
      doc
        .font(font)
        .fontSize(size)
        .fillColor(color)
        .text(text, MARGIN, doc.y, { width, lineGap: 2 });
      doc.y += gap;
    };
    const sectionTitle = (text: string) => {
      doc.y += 10;
      write(text, { font: BOLD_FONT, size: 14, gap: 6 });
    };
    const itemTitle = (text: string, color = TEXT_COLOR) =>
      write(text, { font: BOLD_FONT, size: 11, color });
    const label = (text: string) =>
      write(text, { font: BOLD_FONT, size: 9.5, color: MUTED_COLOR, gap: 2 });
    const bullets = (items: string[]) => {
      for (const item of items) {
        keepOnPage();
        const top = doc.y;
        doc.font(REGULAR_FONT).fontSize(10.5).fillColor(TEXT_COLOR);
        doc.text("•", MARGIN, top);
        doc.text(item, MARGIN + BULLET_INDENT, top, {
          width: width - BULLET_INDENT,
          lineGap: 2,
        });
        doc.y += 3;
      }
      doc.x = MARGIN;
      doc.y += 2;
    };

    write("의사결정 보고서", { font: BOLD_FONT, size: 20, gap: 8 });
    write("AI 분석은 틀릴 수 있습니다. 최종 판단은 반드시 사람이 해 주세요.", {
      font: BOLD_FONT,
    });
    write(
      "발언 인용과 근거는 이 파일에 넣지 않았습니다. 메일에 있는 보고서 링크에서 볼 수 있습니다.",
      { size: 9.5, color: MUTED_COLOR },
    );

    sectionTitle(`${source}에서 결정된 사항`);
    if (report.decisions.length === 0) write("합의된 결론 없음");
    else bullets(report.decisions.map((decision) => decision.content));

    sectionTitle("미해결 문제");
    if (report.unresolvedIssues.length === 0) write("미해결 문제 없음");
    for (const issue of report.unresolvedIssues) {
      itemTitle(issue.content);
      write(`이유: ${issue.reason}`, { gap: 8 });
    }

    sectionTitle("주요 사안별 문제점과 핵심 쟁점");
    for (const topic of report.topics) {
      itemTitle(topic.title);
      write(`문제점: ${topic.problem}`);
      bullets(topic.issues.map((issue) => `쟁점: ${issue.content}`));
    }

    sectionTitle("논의된 해결 방안과 장단점 비교");
    const topicsWithSolutions = report.topics.filter(
      (topic) => topic.solutions.length > 0,
    );
    if (topicsWithSolutions.length === 0) write("논의된 해결 방안 없음");
    for (const topic of topicsWithSolutions) {
      itemTitle(topic.title);
      for (const solution of topic.solutions) {
        write(solution.name, { font: BOLD_FONT });
        label("장점");
        bullets(solution.pros.map(formatProsConsPoint));
        label("단점");
        bullets(solution.cons.map(formatProsConsPoint));
      }
    }

    // 결정 사항과 섞이지 않도록 AI 제안은 새 쪽에서 색을 달리해 시작한다.
    doc.addPage();
    doc.rect(MARGIN, doc.y, width, 54).fill(AI_BACKGROUND);
    doc.y += 8;
    write("AI 제안", { font: BOLD_FONT, size: 16, color: AI_COLOR, gap: 2 });
    write(
      `${source}에서 나온 내용이 아니라 AI가 제안하는 새로운 대안과 추천 결론입니다.`,
      { size: 9.5, gap: 14 },
    );

    for (const alternative of report.alternatives) {
      itemTitle(`[AI 제안] ${alternative.title}`, AI_COLOR);
      write(alternative.description);
      label("기대 효과");
      bullets(alternative.expectedEffects.map(formatPoint));
      label("위험 요소");
      bullets(alternative.risks.map(formatPoint));
      label("실행 전략");
      bullets(alternative.executionSteps.map(formatPoint));
      doc.y += 6;
    }

    if (report.finalConclusion) {
      itemTitle("[AI 제안] AI 추천 결론", AI_COLOR);
      write(`${source}에서 합의된 결론이 아니라 AI가 추천하는 방향입니다.`, {
        size: 9.5,
        color: MUTED_COLOR,
      });
      write(report.finalConclusion.direction, { font: BOLD_FONT });
      label("추천 이유");
      bullets(report.finalConclusion.reasons.map(formatPoint));
    }

    const { start, count } = doc.bufferedPageRange();
    for (let index = 0; index < count; index++) {
      doc.switchToPage(start + index);
      // 여백 안에 쓰면 새 쪽이 생기므로 쪽 번호를 쓰는 동안만 여백을 없앤다.
      doc.page.margins.bottom = 0;
      doc
        .font(REGULAR_FONT)
        .fontSize(8.5)
        .fillColor(MUTED_COLOR)
        .text(
          `DecisionFlow · ${index + 1} / ${count}`,
          MARGIN,
          doc.page.height - MARGIN + 15,
          { width, align: "center", lineBreak: false },
        );
    }

    doc.end();
  });
}
