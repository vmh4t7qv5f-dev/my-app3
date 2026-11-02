import "server-only";

import OpenAI from "openai";

import { getServerEnv } from "./env";

// 모델을 바꿀 때는 이곳만 고친다.
export const TRANSCRIPTION_MODEL = "whisper-1";
export const ANALYSIS_MODEL = "gpt-6.1-sol";

let client: OpenAI | undefined;

export function getOpenAI(): OpenAI {
  // PRD에 따라 실패하면 자동으로 1회만 다시 시도한다.
  client ??= new OpenAI({
    apiKey: getServerEnv("OPENAI_API_KEY"),
    maxRetries: 1,
  });
  return client;
}
