import type { ReactNode } from "react";

import type { Report } from "@/lib/report";

type Quote = Report["topics"][number]["issues"][number]["quotes"][number];
type Solution = Report["topics"][number]["solutions"][number];
type Alternative = Report["alternatives"][number];

function formatTime(totalSeconds: number): string {
  const seconds = Math.floor(totalSeconds);
  const pad = (value: number) => String(value).padStart(2, "0");
  const minutes = pad(Math.floor((seconds % 3600) / 60));
  const rest = pad(seconds % 60);
  return seconds >= 3600
    ? `${Math.floor(seconds / 3600)}:${minutes}:${rest}`
    : `${minutes}:${rest}`;
}

function Label({ children }: { children: ReactNode }) {
  return (
    <span className="mx-1 inline-block rounded bg-violet-100 px-1.5 py-0.5 text-xs font-medium whitespace-nowrap text-violet-900 dark:bg-violet-900 dark:text-violet-100">
      {children}
    </span>
  );
}

function Quotes({ quotes }: { quotes: Quote[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-1 border-l-2 border-border pl-3 text-sm text-muted-foreground">
      {quotes.map((quote, index) => (
        <li key={index}>
          <span className="font-mono">[{formatTime(quote.startSeconds)}]</span>{" "}
          &ldquo;{quote.text}&rdquo;
        </li>
      ))}
    </ul>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="text-xl font-semibold">{title}</h3>
      {children}
    </section>
  );
}

function Empty({ children }: { children: ReactNode }) {
  return <p className="text-muted-foreground">{children}</p>;
}

function ProsConsList({
  title,
  points,
}: {
  title: string;
  points: Solution["pros"];
}) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm">
        {points.map((point, index) => (
          <li key={index}>
            {point.text}
            {!point.mentionedInMeeting && <Label>AI 분석</Label>}
            {point.hasAiEstimate && <Label>AI 추정</Label>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AlternativeList({
  title,
  points,
}: {
  title: string;
  points: Alternative["risks"];
}) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <ul className="mt-1 flex list-disc flex-col gap-1 pl-5 text-sm">
        {points.map((point, index) => (
          <li key={index}>
            {point.text}
            {point.hasAiEstimate && <Label>AI 추정</Label>}
          </li>
        ))}
      </ul>
    </div>
  );
}

// PRD 양식 순서대로 보여 준다. 안내 문구와 "AI 제안" 표시는 AI 답변과 상관없이 항상 나온다.
export function ReportView({ report }: { report: Report }) {
  const topicsWithSolutions = report.topics.filter(
    (topic) => topic.solutions.length > 0,
  );
  // 이 항목이 생기기 전에 저장된 보고서는 모두 회의 보고서다.
  const source = report.isMeeting === false ? "대화" : "회의";

  return (
    <article className="flex flex-col gap-10">
      <p
        role="note"
        className="rounded-lg border border-border bg-muted p-4 font-medium"
      >
        AI 분석은 틀릴 수 있습니다. 최종 판단은 반드시 사람이 해 주세요.
      </p>

      <div className="flex flex-col gap-8">
        <h2 className="text-2xl font-bold">{source} 내용</h2>

        <Section title={`${source}에서 결정된 사항`}>
          {report.decisions.length === 0 ? (
            <Empty>합의된 결론 없음</Empty>
          ) : (
            <ul className="flex flex-col gap-4">
              {report.decisions.map((decision, index) => (
                <li key={index}>
                  <p className="font-medium">{decision.content}</p>
                  <Quotes
                    quotes={[...decision.quotes, ...decision.agreementQuotes]}
                  />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="미해결 문제">
          {report.unresolvedIssues.length === 0 ? (
            <Empty>미해결 문제 없음</Empty>
          ) : (
            <ul className="flex flex-col gap-4">
              {report.unresolvedIssues.map((issue, index) => (
                <li key={index}>
                  <p className="font-medium">{issue.content}</p>
                  <p className="mt-1 text-sm">이유: {issue.reason}</p>
                  <Quotes quotes={issue.quotes} />
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section title="주요 사안별 문제점과 핵심 쟁점">
          <div className="flex flex-col gap-6">
            {report.topics.map((topic, index) => (
              <div key={index}>
                <h4 className="font-semibold">{topic.title}</h4>
                <p className="mt-1">문제점: {topic.problem}</p>
                <ul className="mt-2 flex flex-col gap-3">
                  {topic.issues.map((issue, issueIndex) => (
                    <li key={issueIndex}>
                      <p>쟁점: {issue.content}</p>
                      <Quotes quotes={issue.quotes} />
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Section>

        <Section title="논의된 해결 방안과 장단점 비교">
          {topicsWithSolutions.length === 0 ? (
            <Empty>논의된 해결 방안 없음</Empty>
          ) : (
            <div className="flex flex-col gap-6">
              {topicsWithSolutions.map((topic, index) => (
                <div key={index} className="flex flex-col gap-3">
                  <h4 className="font-semibold">{topic.title}</h4>
                  {topic.solutions.map((solution, solutionIndex) => (
                    <div
                      key={solutionIndex}
                      className="rounded-lg border border-border p-4"
                    >
                      <p className="font-medium">{solution.name}</p>
                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <ProsConsList title="장점" points={solution.pros} />
                        <ProsConsList title="단점" points={solution.cons} />
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </Section>
      </div>

      <section className="flex flex-col gap-4 rounded-lg border-2 border-violet-400 bg-violet-50 p-4 sm:p-6 dark:bg-violet-950">
        <div>
          <h2 className="text-2xl font-bold">AI 제안</h2>
          <p className="mt-1 text-sm">
            {source}에서 나온 내용이 아니라 AI가 제안하는 새로운 대안과 추천
            결론입니다.
          </p>
        </div>
        {report.alternatives.map((alternative, index) => (
          <div
            key={index}
            className="flex flex-col gap-3 rounded-lg bg-background p-4"
          >
            <h3 className="font-semibold">
              <Label>AI 제안</Label>
              {alternative.title}
            </h3>
            <p className="text-sm">{alternative.description}</p>
            <AlternativeList
              title="기대 효과"
              points={alternative.expectedEffects}
            />
            <AlternativeList title="위험 요소" points={alternative.risks} />
            <AlternativeList
              title="실행 전략"
              points={alternative.executionSteps}
            />
          </div>
        ))}
        {report.finalConclusion && (
          <div className="flex flex-col gap-3 rounded-lg border border-violet-400 bg-background p-4">
            <h3 className="font-semibold">
              <Label>AI 제안</Label>
              AI 추천 결론
            </h3>
            <p className="text-xs text-muted-foreground">
              {source}에서 합의된 결론이 아니라 AI가 추천하는 방향입니다.
            </p>
            <p className="font-medium">{report.finalConclusion.direction}</p>
            <AlternativeList
              title="추천 이유"
              points={report.finalConclusion.reasons}
            />
          </div>
        )}
      </section>
    </article>
  );
}
