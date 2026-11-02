import "server-only";

import { parseBuffer } from "music-metadata";

import {
  isTooLong,
  MAX_FILE_BYTES,
  type UploadErrorCode,
} from "@/lib/upload-rules";

// 파일 이름이 아니라 내용으로 형식을 판단한다.
const ALLOWED_CONTAINERS = /^(MPEG|WAVE|M4A|mp4|isom|mp42)/i;

// 올라온 파일을 서버에서 다시 검사한다. 문제가 없으면 null을 돌려준다.
export async function findAudioProblem(
  audio: Blob,
): Promise<UploadErrorCode | null> {
  if (audio.size === 0) return "empty_file";
  if (audio.size > MAX_FILE_BYTES) return "too_large";

  try {
    const bytes = new Uint8Array(await audio.arrayBuffer());
    const { format } = await parseBuffer(bytes, undefined, {
      duration: true,
      skipCovers: true,
    });

    if (!format.container || !ALLOWED_CONTAINERS.test(format.container)) {
      return "unsupported_format";
    }
    if (format.hasVideo) return "unsupported_format";
    if (!format.duration) return "damaged_file";
    if (isTooLong(format.duration)) return "too_long";
    return null;
  } catch {
    return "damaged_file";
  }
}
