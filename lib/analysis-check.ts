// AI 답변을 그대로 믿지 않고 코드로 검사한다. OpenAI를 부르는 부분은 밖에서 넘겨받는다.
import { ZodError } from "zod";

import {
  meetingAnalysisSchema,
  type AiSuggestions,
  type MeetingAnalysis,
  type MeetingAnalysisDraft,
} from "./report";
import type { TranscriptSegment } from "./server/transcribe";

export type AnalysisReply = {
  isAnalyzable: boolean;
  analysis: MeetingAnalysisDraft | null;
};

type Quote = MeetingAnalysis["topics"][number]["issues"][number]["quotes"][number];

const MAX_ATTEMPTS = 2;
const TIME_TOLERANCE_SECONDS = 1;
const NO_AGREEMENT_REASON =
  "다른 참석자의 동의나 정리 발언을 확인할 수 없어 결정으로 보지 않았습니다.";

// 띄어쓰기와 문장 부호 차이는 같은 발언으로 본다.
function normalize(text: string): string {
  return text.replace(/[\s.,?!…·"'“”‘’]/g, "");
}

// 인용이 변환 텍스트에 있고, 인용한 위치의 시각과 맞으면 true다.
// 긴 인용은 구간 경계에 걸칠 수 있어 구간을 이어 붙인 글에서 찾는다.
function isQuoteInTranscript(
  quote: Quote,
  segments: TranscriptSegment[],
): boolean {
  const target = normalize(quote.text);
  if (!target) return false;

  const parts = segments.map((segment) => normalize(segment.text));
  const joined = parts.join("");
  const segmentAt = (offset: number) => {
    let end = 0;
    for (let index = 0; index < parts.length; index++) {
      end += parts[index].length;
      if (offset < end) return segments[index];
    }
    return segments[segments.length - 1];
  };

  // "네"처럼 여러 번 나오는 말은 시각이 맞는 곳이 하나라도 있으면 된다.
  let at = joined.indexOf(target);
  while (at !== -1) {
    const first = segmentAt(at);
    const last = segmentAt(at + target.length - 1);
    if (
      quote.startSeconds >= first.startSeconds - TIME_TOLERANCE_SECONDS &&
      quote.startSeconds <= last.endSeconds + TIME_TOLERANCE_SECONDS
    ) {
      return true;
    }
    at = joined.indexOf(target, at + 1);
  }
  return false;
}

function hasOnlyRealQuotes(
  draft: MeetingAnalysisDraft,
  segments: TranscriptSegment[],
): boolean {
  const quotes = [
    ...draft.decisions.flatMap((decision) => [
      ...decision.quotes,
      ...decision.agreementQuotes,
    ]),
    ...draft.unresolvedIssues.flatMap((issue) => issue.quotes),
    ...draft.topics.flatMap((topic) =>
      topic.issues.flatMap((issue) => issue.quotes),
    ),
  ];
  return quotes.every((quote) => isQuoteInTranscript(quote, segments));
}

// 동의나 정리 발언 인용이 없는 결정을 "미해결"로 옮긴다.
function moveUnagreedDecisions(draft: MeetingAnalysisDraft): MeetingAnalysis {
  const unagreed = draft.decisions.filter(
    (decision) => decision.agreementQuotes.length === 0,
  );
  return meetingAnalysisSchema.parse({
    ...draft,
    decisions: draft.decisions.filter(
      (decision) => decision.agreementQuotes.length > 0,
    ),
    unresolvedIssues: [
      ...draft.unresolvedIssues,
      ...unagreed.map((decision) => ({
        content: decision.content,
        reason: NO_AGREEMENT_REASON,
        quotes: decision.quotes,
      })),
    ],
  });
}

// 형식이 틀리거나 accept가 undefined를 돌려주면 1회 다시 생성한다.
async function retryUntilAccepted<Reply, Result>(
  requestReply: () => Promise<Reply | null>,
  accept: (reply: Reply | null) => Result | undefined,
): Promise<Result> {
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
    try {
      const result = accept(await requestReply());
      if (result !== undefined) return result;
    } catch (cause) {
      if (!(cause instanceof ZodError)) throw cause;
    }
  }
  throw new Error("검사를 통과한 AI 답변을 받지 못했습니다.");
}

// 분석 답변을 받아 검사한다. 분석할 말소리가 없으면 null을 돌려준다.
export function getCheckedAnalysis(
  segments: TranscriptSegment[],
  requestReply: () => Promise<AnalysisReply | null>,
): Promise<MeetingAnalysis | null> {
  return retryUntilAccepted(requestReply, (reply) => {
    if (reply && !reply.isAnalyzable) return null;
    return reply?.analysis && hasOnlyRealQuotes(reply.analysis, segments)
      ? moveUnagreedDecisions(reply.analysis)
      : undefined;
  });
}

// 대안의 개수와 추천 결론의 필수 항목은 답변 형식 검사에서 걸러진다.
export function getCheckedAiSuggestions(
  requestReply: () => Promise<AiSuggestions | null>,
): Promise<AiSuggestions> {
  return retryUntilAccepted(requestReply, (reply) => reply ?? undefined);
}
