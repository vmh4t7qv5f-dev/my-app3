// 보고서의 형식이다. AI 답변 검사, 저장, 화면 표시가 모두 이 정의를 따른다. 비밀 값을 넣지 않는다.
// "AI 제안"과 판단 책임 안내 문구는 AI에게 맡기지 않고 화면이 항상 표시하므로 여기에 없다.
import { z } from "zod";

const requiredText = z.string().trim().min(1);

export const MAX_TOPICS = 7;
export const ALTERNATIVE_COUNT = 3;

const quoteSchema = z.object({
  startSeconds: z.number().nonnegative(),
  text: requiredText,
});

// 회의에 없는 수치나 사실이 들어간 항목은 화면에 "AI 추정"으로 표시한다.
const aiWrittenPointSchema = z.object({
  text: requiredText,
  hasAiEstimate: z.boolean(),
});

// mentionedInMeeting이 false인 장단점은 화면에 "AI 분석"으로 표시한다.
const prosConsPointSchema = aiWrittenPointSchema.extend({
  mentionedInMeeting: z.boolean(),
});

// 결정은 근거 인용과 별도로 다른 참석자의 동의나 정리 발언 인용이 있어야 한다.
const decisionSchema = z.object({
  content: requiredText,
  quotes: z.array(quoteSchema).min(1),
  agreementQuotes: z.array(quoteSchema).min(1),
});

const unresolvedIssueSchema = z.object({
  content: requiredText,
  reason: requiredText,
  quotes: z.array(quoteSchema).min(1),
});

const topicIssueSchema = z.object({
  content: requiredText,
  quotes: z.array(quoteSchema).min(1),
});

const solutionSchema = z.object({
  name: requiredText,
  pros: z.array(prosConsPointSchema).min(1),
  cons: z.array(prosConsPointSchema).min(1),
});

const topicSchema = z.object({
  title: requiredText,
  problem: requiredText,
  issues: z.array(topicIssueSchema).min(1),
  solutions: z.array(solutionSchema),
});

const alternativeSchema = z.object({
  title: requiredText,
  description: requiredText,
  expectedEffects: z.array(aiWrittenPointSchema).min(1),
  risks: z.array(aiWrittenPointSchema).min(1),
  executionSteps: z.array(aiWrittenPointSchema).min(1),
});

// 결정 사항이 0개이면 화면에 "합의된 결론 없음"으로 표시한다.
export const reportSchema = z.object({
  decisions: z.array(decisionSchema),
  unresolvedIssues: z.array(unresolvedIssueSchema),
  topics: z.array(topicSchema).min(1).max(MAX_TOPICS),
  alternatives: z.array(alternativeSchema).length(ALTERNATIVE_COUNT),
});

export type Report = z.infer<typeof reportSchema>;

export const alternativesSchema = reportSchema.pick({ alternatives: true });

export type Alternatives = z.infer<typeof alternativesSchema>;

// 대안을 뺀 회의 분석 결과다. 대안은 따로 만든다.
export const meetingAnalysisSchema = reportSchema.omit({ alternatives: true });

export type MeetingAnalysis = z.infer<typeof meetingAnalysisSchema>;

// AI의 회의 분석 답변이다. 동의 인용이 없는 결정도 일단 받아서 코드 검사에서
// "미해결"로 옮기므로 이 단계에서는 빈 목록을 허용한다.
export const meetingAnalysisDraftSchema = meetingAnalysisSchema.extend({
  decisions: z.array(
    decisionSchema.extend({ agreementQuotes: z.array(quoteSchema) }),
  ),
});

export type MeetingAnalysisDraft = z.infer<typeof meetingAnalysisDraftSchema>;
