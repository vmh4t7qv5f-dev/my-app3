// 한 줄씩 읽은 음성을 화자별 목소리로 바꾸고 이어 붙여 약 60분짜리 회의 음성(meeting-60min.wav)을 만든다.
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SAMPLE_RATE = 16000;
// 앱의 60분 제한을 넘지 않도록 30초 여유를 둔다.
const TARGET_SECONDS = 59 * 60 + 30;
// 1보다 작으면 낮고 굵은 목소리, 크면 높은 목소리가 된다.
const VOICE_PITCH = { 지훈: 0.84, 서연: 1.05, 민재: 0.9, 하늘: 1.12, 태경: 0.78 };

// 다시 만들어도 같은 결과가 나오도록 고정된 난수를 쓴다.
let seed = 20261103;
function random() {
  seed = (seed * 1664525 + 1013904223) >>> 0;
  return seed / 2 ** 32;
}

function readSamples(path) {
  const file = readFileSync(path);
  const dataAt = file.indexOf("data");
  const size = file.readUInt32LE(dataAt + 4);
  return new Int16Array(file.buffer.slice(file.byteOffset + dataAt + 8, file.byteOffset + dataAt + 8 + size));
}

// 재생 속도를 바꾸는 방식으로 목소리 높낮이를 바꾼다.
function changePitch(samples, pitch) {
  const result = new Int16Array(Math.floor(samples.length / pitch));
  for (let i = 0; i < result.length; i++) {
    const position = i * pitch;
    const left = Math.floor(position);
    const right = Math.min(left + 1, samples.length - 1);
    result[i] = samples[left] + (samples[right] - samples[left]) * (position - left);
  }
  return result;
}

function writeWav(path, samples) {
  const header = Buffer.alloc(44);
  header.write("RIFF", 0);
  header.writeUInt32LE(36 + samples.byteLength, 4);
  header.write("WAVEfmt ", 8);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write("data", 36);
  header.writeUInt32LE(samples.byteLength, 40);
  writeFileSync(path, Buffer.concat([header, Buffer.from(samples.buffer, samples.byteOffset, samples.byteLength)]));
}

const lines = readFileSync(join(HERE, "meeting-60min.txt"), "utf8").split(/\r?\n/);
const tempDir = mkdtempSync(join(tmpdir(), "meeting-60min-"));

try {
  execFileSync(
    "powershell",
    ["-NoProfile", "-ExecutionPolicy", "Bypass", "-File", join(HERE, "generate-meeting-60min.ps1"), "-OutputDir", tempDir],
    { stdio: "inherit" },
  );

  // 발언 조각과, 그 앞의 쉬는 길이(안건이 바뀌면 더 길게)를 모은다.
  const clips = [];
  let newSection = false;
  for (const line of lines) {
    if (!line.trim()) continue;
    if (line.startsWith("#")) {
      newSection = true;
      continue;
    }
    const speaker = line.split("|")[0];
    const samples = readSamples(join(tempDir, `${String(clips.length).padStart(4, "0")}.wav`));
    clips.push({
      voice: changePitch(samples, VOICE_PITCH[speaker]),
      gap: newSection ? 3 : 0.3 + random() * 0.8,
    });
    newSection = false;
  }

  const speechSeconds = clips.reduce((sum, clip) => sum + clip.voice.length, 0) / SAMPLE_RATE;
  const gapSeconds = clips.reduce((sum, clip) => sum + clip.gap, 0);
  // 전체 길이가 목표에 맞도록 발언 사이의 쉬는 시간을 늘이거나 줄인다.
  const gapScale = (TARGET_SECONDS - speechSeconds) / gapSeconds;
  console.log(`발언 ${clips.length}개, 말하는 시간 ${(speechSeconds / 60).toFixed(1)}분, 쉬는 시간 배율 ${gapScale.toFixed(2)}`);
  if (gapScale < 0.4 || gapScale > 1.8) {
    throw new Error("쉬는 시간이 어색해지므로 대본 분량을 조정해야 합니다.");
  }

  const output = new Int16Array(TARGET_SECONDS * SAMPLE_RATE);
  // 완전한 무음은 부자연스러우므로 회의실의 작은 소음을 깐다.
  for (let i = 0; i < output.length; i++) output[i] = (random() - 0.5) * 40;

  let at = 0;
  for (const clip of clips) {
    at += Math.round(clip.gap * gapScale * SAMPLE_RATE);
    for (let i = 0; i < clip.voice.length && at + i < output.length; i++) {
      output[at + i] = Math.max(-32768, Math.min(32767, output[at + i] + clip.voice[i]));
    }
    at += clip.voice.length;
  }

  const outputPath = join(HERE, "meeting-60min.wav");
  writeWav(outputPath, output);
  console.log(`만들었습니다: ${outputPath} (마지막 발언 끝 ${(at / SAMPLE_RATE / 60).toFixed(2)}분)`);
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
