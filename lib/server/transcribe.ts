import "server-only";

import { toFile } from "openai";
import { z } from "zod";

import { getOpenAI, TRANSCRIPTION_MODEL } from "./openai";

// 변환 단계에서 분석 단계로 요청에 담아 넘기므로 받는 쪽에서 형식을 검사한다.
export const transcriptSchema = z.object({
  text: z.string(),
  segments: z.array(
    z.object({
      startSeconds: z.number(),
      endSeconds: z.number(),
      text: z.string(),
    }),
  ),
});

export type Transcript = z.infer<typeof transcriptSchema>;
export type TranscriptSegment = Transcript["segments"][number];

const MIN_TRANSCRIPT_CHARACTERS = 300;

// 글자 수는 공백을 포함해 센다.
export function isTranscriptTooShort(transcript: Transcript): boolean {
  return transcript.text.length < MIN_TRANSCRIPT_CHARACTERS;
}

// 저장된 파일에는 확장자가 없으므로 올릴 때 지정한 형식으로 파일 이름을 만든다.
const FILE_NAMES_BY_TYPE: Record<string, string> = {
  "audio/mpeg": "audio.mp3",
  "audio/mp3": "audio.mp3",
  "audio/mp4": "audio.m4a",
  "audio/m4a": "audio.m4a",
  "audio/x-m4a": "audio.m4a",
  "audio/wav": "audio.wav",
  "audio/wave": "audio.wav",
  "audio/x-wav": "audio.wav",
  "audio/vnd.wave": "audio.wav",
};

// 음성을 텍스트와 발언 시각으로 바꾼다. 결과는 메모리에서만 다루며 저장하거나 로그에 남기지 않는다.
export async function transcribeAudio(audio: Blob): Promise<Transcript> {
  const file = await toFile(
    audio,
    FILE_NAMES_BY_TYPE[audio.type] ?? "audio.wav",
    { type: audio.type },
  );

  const result = await getOpenAI().audio.transcriptions.create({
    file,
    model: TRANSCRIPTION_MODEL,
    language: "ko",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  return {
    text: result.text.trim(),
    segments: (result.segments ?? []).map((segment) => ({
      startSeconds: segment.start,
      endSeconds: segment.end,
      text: segment.text.trim(),
    })),
  };
}
