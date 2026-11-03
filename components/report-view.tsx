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

// 본문을 먼저 읽을 수 있도록 인용은 접어 두고, 누르면 발언 시각과 함께 펼친다.
function Quotes({ quotes }: { quotes: Quote[] }) {
  return (
    <details className="mt-2 text-sm text-muted-foreground">
      <summary className="cursor-pointer select-none hover:text-foreground">
        근거 발언 {quotes.length}개
      </summary>
      <ul className="mt-2 flex flex-col gap-1 border-l-2 border-border pl-3">
        {quotes.map((quote, index) => (
          <li key={index}>
            <span className="font-mono">
              [{formatTime(quote.startSeconds)}]
            </span>{" "}
            &ldquo;{quote.text}&rdquo;
          </li>
        ))}
      </ul>
    </details>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      className="paper-card reveal-card flex scroll-mt-4 flex-col gap-4 p-5 sm:p-6"
    >
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

// 안내 문구 다음에 AI 요약과 추천 결론을 먼저 보여 주고, 회의 내용과 새로운 대안이 뒤따른다.
// 안내 문구와 AI 표시는 AI 답변과 상관없이 항상 나온다.
export function ReportView({ report }: { report: Report }) {
  // 이 항목이 생기기 전에 저장된 보고서는 모두 회의 보고서다.
  const source = report.isMeeting === false ? "대화" : "회의";
  const jumpLinks = [
    { href: "#decisions", label: `결정 ${report.decisions.length}` },
    { href: "#unresolved", label: `미해결 ${report.unresolvedIssues.length}` },
    { href: "#topics", label: `사안 ${report.topics.length}` },
    { href: "#alternatives", label: `AI 대안 ${report.alternatives.length}` },
  ];

  return (
    <article className="flex flex-col gap-6">
      <p
        role="note"
        className="paper-card border-l-4 border-l-primary p-4 font-medium"
      >
        AI 분석은 틀릴 수 있습니다. 최종 판단은 반드시 사람이 해 주세요.
      </p>

      {(report.summary || report.finalConclusion) && (
        <section
          aria-label="AI 요약과 추천"
          className="glass-card glass-card--violet flex flex-col gap-4 p-4 sm:p-6"
        >
          {report.summary && (
            <div className="card-inset flex flex-col gap-2 p-4">
              <h2 className="text-lg font-semibold">
                <Label>AI 요약</Label>
                한눈에 보기
              </h2>
              <p className="text-xs text-muted-foreground">
                {source} 내용을 AI가 정리했습니다. 정확한 내용은 아래의 근거 발언에서
                확인해 주세요.
              </p>
              <ul className="flex list-disc flex-col gap-1.5 pl-5">
                {report.summary.map((point, index) => (
                  <li key={index}>{point}</li>
                ))}
              </ul>
            </div>
          )}
          {report.finalConclusion && (
            <div className="card-inset flex flex-col gap-3 p-4">
              <h2 className="text-lg font-semibold">
                <Label>AI 제안</Label>
                AI 추천 결론
              </h2>
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
      )}

      <nav aria-label="보고서 구역 바로가기" className="flex flex-wrap gap-2">
        {jumpLinks.map((link) => (
          <a
            key={link.href}
            href={link.href}
            className="rounded-full border border-border bg-white/70 px-3 py-1.5 text-sm font-medium transition-colors hover:bg-white"
          >
            {link.label}
          </a>
        ))}
      </nav>

      <h2 className="mt-2 text-2xl font-semibold">{source} 내용</h2>

      <Section id="decisions" title={`${source}에서 결정된 사항`}>
        {report.decisions.length === 0 ? (
          <Empty>합의된 결론 없음</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {report.decisions.map((decision, index) => (
              <li
                key={index}
                className="rounded-[10px] border-l-4 border-l-emerald-600 bg-white/80 p-4"
              >
                <p className="font-medium">{decision.content}</p>
                <Quotes
                  quotes={[...decision.quotes, ...decision.agreementQuotes]}
                />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="unresolved" title="미해결 문제">
        {report.unresolvedIssues.length === 0 ? (
          <Empty>미해결 문제 없음</Empty>
        ) : (
          <ul className="flex flex-col gap-3">
            {report.unresolvedIssues.map((issue, index) => (
              <li
                key={index}
                className="rounded-[10px] border-l-4 border-l-amber-500 bg-white/80 p-4"
              >
                <p className="font-medium">{issue.content}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  이유: {issue.reason}
                </p>
                <Quotes quotes={issue.quotes} />
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section id="topics" title="사안별 문제점과 해결 방안">
        <div className="flex flex-col gap-4">
          {report.topics.map((topic, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-[10px] bg-white/80 p-4"
            >
              <h4 className="text-lg font-semibold">
                {index + 1}. {topic.title}
              </h4>
              <div>
                <p className="text-sm font-medium">문제점</p>
                <p className="mt-1">{topic.problem}</p>
              </div>
              <div>
                <p className="text-sm font-medium">핵심 쟁점</p>
                <ul className="mt-1 flex flex-col gap-2">
                  {topic.issues.map((issue, issueIndex) => (
                    <li key={issueIndex}>
                      <p>{issue.content}</p>
                      <Quotes quotes={issue.quotes} />
                    </li>
                  ))}
                </ul>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">논의된 해결 방안</p>
                {topic.solutions.length === 0 ? (
                  <Empty>논의된 해결 방안 없음</Empty>
                ) : (
                  topic.solutions.map((solution, solutionIndex) => (
                    <div
                      key={solutionIndex}
                      className="rounded-[10px] border border-border p-4"
                    >
                      <p className="font-medium">{solution.name}</p>
                      <div className="mt-3 grid gap-4 sm:grid-cols-2">
                        <ProsConsList title="장점" points={solution.pros} />
                        <ProsConsList title="단점" points={solution.cons} />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </div>
      </Section>

      <section
        id="alternatives"
        className="glass-card glass-card--violet flex scroll-mt-4 flex-col gap-4 p-4 sm:p-6"
      >
        <div>
          <h2 className="text-2xl font-semibold">AI 제안: 새로운 대안</h2>
          <p className="mt-1 text-sm">
            {source}에서 나온 내용이 아니라 AI가 제안하는 새로운 대안입니다.
          </p>
        </div>
        {report.alternatives.map((alternative, index) => (
          <div key={index} className="card-inset flex flex-col gap-3 p-4">
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
      </section>
    </article>
  );
}
