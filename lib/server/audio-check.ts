import "server-only";

import { parseBuffer } from "music-metadata";

import {
  MAX_DURATION_SECONDS,
  MAX_FILE_BYTES,
  type UploadErrorCode,
} from "@/lib/upload-rules";

import { AUDIO_BUCKET, getSupabase } from "./supabase";

// 파일 이름이 아니라 내용으로 형식을 판단한다.
const ALLOWED_CONTAINERS = /^(MPEG|WAVE|M4A|mp4|isom|mp42)/i;

// 올라온 파일을 서버에서 다시 검사한다. 문제가 없으면 null을 돌려준다.
export async function findAudioProblem(
  id: string,
): Promise<UploadErrorCode | null> {
  const { data, error } = await getSupabase()
    .storage.from(AUDIO_BUCKET)
    .download(id);
  if (error) throw new Error("음성을 내려받지 못했습니다.");

  if (data.size === 0) return "empty_file";
  if (data.size > MAX_FILE_BYTES) return "too_large";

  try {
    const bytes = new Uint8Array(await data.arrayBuffer());
    const { format } = await parseBuffer(bytes, undefined, {
      duration: true,
      skipCovers: true,
    });

    if (!format.container || !ALLOWED_CONTAINERS.test(format.container)) {
      return "unsupported_format";
    }
    if (format.hasVideo) return "unsupported_format";
    if (!format.duration) return "damaged_file";
    if (format.duration > MAX_DURATION_SECONDS) return "too_long";
    return null;
  } catch {
    return "damaged_file";
  }
}
