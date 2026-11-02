// 브라우저와 서버가 함께 쓰는 업로드 기준과 안내 문구다. 비밀 값을 넣지 않는다.
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_DURATION_SECONDS = 60 * 60;
// 압축하면 끝에 아주 짧은 여백이 붙으므로 정확히 60분인 음성이 걸리지 않도록 1초를 봐준다.
const DURATION_TOLERANCE_SECONDS = 1;
// 이보다 큰 원본은 브라우저가 줄이다 멈출 수 있어 받지 않는다.
export const MAX_ORIGINAL_FILE_BYTES = 1024 * 1024 * 1024;

export const CONTENT_TYPES_BY_EXTENSION: Record<string, string> = {
  mp3: "audio/mpeg",
  m4a: "audio/mp4",
  wav: "audio/wav",
};

export type UploadErrorCode =
  | "unsupported_format"
  | "too_large"
  | "too_long"
  | "empty_file"
  | "damaged_file"
  | "too_little_speech"
  | "not_a_meeting"
  | "processing_failed"
  | "original_too_large"
  | "compression_failed";

export const UPLOAD_ERROR_MESSAGES: Record<UploadErrorCode, string> = {
  unsupported_format:
    "mp3, m4a, wav 파일만 올릴 수 있습니다. 음성 변환 프로그램에서 이 형식으로 저장한 뒤 다시 올려 주세요.",
  too_large:
    "파일이 25MB를 넘습니다. 음성 변환 프로그램에서 mp3, 모노(1채널), 48kbps로 저장하면 60분 회의도 25MB 안에 들어갑니다.",
  too_long:
    "음성이 60분을 넘습니다. 60분 이하로 잘라서 다시 올려 주세요.",
  empty_file:
    "파일이 비어 있습니다. 녹음 파일을 확인하고 다시 올려 주세요.",
  damaged_file:
    "파일을 읽을 수 없습니다. 손상되었거나 음성 파일이 아닐 수 있습니다. 원본을 다시 저장한 뒤 올려 주세요.",
  too_little_speech:
    "음성에서 알아들은 내용이 300자 미만이라 분석할 수 없습니다. 회의 내용이 제대로 녹음되었는지 음성 파일을 확인하고 다시 올려 주세요.",
  not_a_meeting:
    "회의 음성으로 판단되지 않아 분석을 중단했습니다. 회의를 녹음한 파일이 맞는지 확인하고 다시 올려 주세요.",
  processing_failed:
    "분석 중 문제가 생겨 보고서를 만들지 못했습니다. 파일을 다시 올려 주세요.",
  original_too_large:
    "파일이 1GB를 넘어 자동으로 줄일 수 없습니다. 음성 변환 프로그램에서 mp3, 모노(1채널), 48kbps로 저장한 뒤 다시 올려 주세요.",
  compression_failed:
    "파일을 자동으로 줄이지 못했습니다. 음성 변환 프로그램에서 mp3, 모노(1채널), 48kbps로 저장한 뒤 다시 올려 주세요.",
};

export function isTooLong(durationSeconds: number): boolean {
  return durationSeconds > MAX_DURATION_SECONDS + DURATION_TOLERANCE_SECONDS;
}

export function getFileExtension(fileName: string): string {
  return fileName.includes(".")
    ? (fileName.split(".").pop()?.toLowerCase() ?? "")
    : "";
}

export function isUploadErrorCode(code: unknown): code is UploadErrorCode {
  return typeof code === "string" && code in UPLOAD_ERROR_MESSAGES;
}
