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

// 합의된 결론이 아니라 AI가 추천하는 방향이다. 화면에 항상 "AI 제안"으로 표시한다.
const finalConclusionSchema = z.object({
  direction: requiredText,
  reasons: z.array(aiWrittenPointSchema).min(1),
});

// 결정 사항이 0개이면 화면에 "합의된 결론 없음"으로 표시한다.
// isMeeting과 finalConclusion이 없는 보고서는 이 항목들이 생기기 전에 저장된 것이다.
export const reportSchema = z.object({
  isMeeting: z.boolean().optional(),
  decisions: z.array(decisionSchema),
  unresolvedIssues: z.array(unresolvedIssueSchema),
  topics: z.array(topicSchema).min(1).max(MAX_TOPICS),
  alternatives: z.array(alternativeSchema).length(ALTERNATIVE_COUNT),
  finalConclusion: finalConclusionSchema.optional(),
});

export type Report = z.infer<typeof reportSchema>;

// AI가 분석 결과를 바탕으로 따로 만드는 부분이다. 새 보고서에는 둘 다 반드시 있어야 한다.
export const aiSuggestionsSchema = z.object({
  alternatives: reportSchema.shape.alternatives,
  finalConclusion: finalConclusionSchema,
});

export type AiSuggestions = z.infer<typeof aiSuggestionsSchema>;

// AI 제안을 뺀 분석 결과다. AI 제안은 따로 만든다.
export const meetingAnalysisSchema = reportSchema.omit({
  alternatives: true,
  finalConclusion: true,
});

export type MeetingAnalysis = z.infer<typeof meetingAnalysisSchema>;

// AI의 분석 답변이다. 동의 인용이 없는 결정도 일단 받아서 코드 검사에서
// "미해결"로 옮기므로 이 단계에서는 빈 목록을 허용한다.
export const meetingAnalysisDraftSchema = meetingAnalysisSchema.extend({
  isMeeting: z.boolean(),
  decisions: z.array(
    decisionSchema.extend({ agreementQuotes: z.array(quoteSchema) }),
  ),
});

export type MeetingAnalysisDraft = z.infer<typeof meetingAnalysisDraftSchema>;
