// 브라우저와 서버가 함께 쓰는 업로드 기준과 안내 문구다. 비밀 값을 넣지 않는다.
export const MAX_FILE_BYTES = 25 * 1024 * 1024;
const MAX_DURATION_SECONDS = 60 * 60;
// 압축하면 끝에 아주 짧은 여백이 붙으므로 정확히 60분인 음성이 걸리지 않도록 1초를 봐준다.
const DURATION_TOLERANCE_SECONDS = 1;
// 이보다 큰 원본은 브라우저가 줄이다 멈출 수 있어 받지 않는다.
export const MAX_ORIGINAL_FILE_BYTES = 1024 * 1024 * 1024;

// 로그인이 없어 누구나 입력할 수 있으므로 스팸에 쓰이지 않도록 보고서당 수신자를 제한한다.
export const MAX_RECIPIENTS = 10;
const MAX_EMAIL_LENGTH = 254;
// 메일 프로그램이 주소가 아닌 다른 뜻으로 해석할 수 있는 문자는 받지 않는다.
const EMAIL_PATTERN = /^[^\s@,;:()<>"]+@[^\s@,;:()<>"]+\.[^\s@,;:()<>"]+$/;

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
  | "no_analyzable_speech"
  | "processing_failed"
  | "original_too_large"
  | "compression_failed"
  | "daily_limit"
  | "invalid_recipients";

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
    "음성에서 알아들은 내용이 300자 미만이라 분석할 수 없습니다. 말소리가 제대로 녹음되었는지 음성 파일을 확인하고 다시 올려 주세요.",
  no_analyzable_speech:
    "노래나 잡음처럼 분석할 말소리가 없어 분석을 중단했습니다. 사람의 말이 녹음된 파일이 맞는지 확인하고 다시 올려 주세요.",
  processing_failed:
    "분석 중 문제가 생겨 보고서를 만들지 못했습니다. 파일을 다시 올려 주세요.",
  original_too_large:
    "파일이 1GB를 넘어 자동으로 줄일 수 없습니다. 음성 변환 프로그램에서 mp3, 모노(1채널), 48kbps로 저장한 뒤 다시 올려 주세요.",
  compression_failed:
    "파일을 자동으로 줄이지 못했습니다. 음성 변환 프로그램에서 mp3, 모노(1채널), 48kbps로 저장한 뒤 다시 올려 주세요.",
  daily_limit:
    "오늘 처리할 수 있는 5건을 모두 사용했습니다. 내일(한국 시간 자정 이후) 다시 올려 주세요.",
  invalid_recipients:
    `이메일 주소를 확인해 주세요. 형식이 올바른 주소를 ${MAX_RECIPIENTS}개까지 입력할 수 있고, 수신자 동의 확인이 필요합니다.`,
};

function isValidEmail(email: string): boolean {
  return email.length <= MAX_EMAIL_LENGTH && EMAIL_PATTERN.test(email);
}

// 쉼표, 세미콜론, 공백, 줄바꿈으로 나눈 주소를 중복 없이 돌려준다. 잘못된 입력이면 null이다.
export function parseRecipientText(text: string): string[] | null {
  const emails = [
    ...new Set(
      text
        .split(/[\s,;]+/)
        .map((email) => email.trim().toLowerCase())
        .filter(Boolean),
    ),
  ];
  return emails.length <= MAX_RECIPIENTS && emails.every(isValidEmail)
    ? emails
    : null;
}

// 시작 요청의 수신자를 서버에서 다시 검사한다. 수신자가 있으면 동의가 있어야 한다.
export function parseRecipientRequest(body: unknown): string[] | null {
  if (typeof body !== "object" || body === null) return null;
  const { recipientEmails, consent } = body as {
    recipientEmails?: unknown;
    consent?: unknown;
  };
  if (
    !Array.isArray(recipientEmails) ||
    !recipientEmails.every((email) => typeof email === "string")
  ) {
    return null;
  }
  const emails = parseRecipientText(recipientEmails.join(" "));
  if (!emails) return null;
  return emails.length === 0 || consent === true ? emails : null;
}

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
