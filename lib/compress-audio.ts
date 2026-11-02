// 25MB가 넘는 음성을 사용자의 브라우저 안에서 줄인다. 원본은 외부로 나가지 않는다.
// 모노 48kbps이면 60분이 약 21.6MB가 된다. 16kHz는 Whisper가 변환에 쓰는 음질이다.
const COMPRESSED_BITRATE = 48_000;
const COMPRESSED_SAMPLE_RATE = 16_000;

export async function compressAudio(
  file: File,
  onProgress: (percent: number) => void,
): Promise<File> {
  // 큰 파일을 고른 사람만 내려받도록 필요할 때 불러온다.
  const {
    ALL_FORMATS,
    BlobSource,
    BufferTarget,
    canEncodeAudio,
    Conversion,
    Input,
    Mp3OutputFormat,
    Output,
    Quality,
  } = await import("mediabunny");

  if (!(await canEncodeAudio("mp3"))) {
    const { registerMp3Encoder } = await import("@mediabunny/mp3-encoder");
    registerMp3Encoder();
  }

  const input = new Input({
    source: new BlobSource(file),
    formats: ALL_FORMATS,
  });
  const target = new BufferTarget();
  const output = new Output({ format: new Mp3OutputFormat(), target });

  try {
    const conversion = await Conversion.init({
      input,
      output,
      audio: {
        codec: "mp3",
        numberOfChannels: 1,
        sampleRate: COMPRESSED_SAMPLE_RATE,
        quality: new Quality({
          bitrate: COMPRESSED_BITRATE,
          bitrateMode: "constant",
        }),
      },
      video: { discard: true },
    });
    if (!conversion.isValid) throw new Error("compression_failed");

    conversion.onProgress = (progress) =>
      onProgress(Math.round(progress * 100));
    await conversion.execute();

    if (!target.buffer) throw new Error("compression_failed");
    return new File([target.buffer], "compressed.mp3", { type: "audio/mpeg" });
  } finally {
    input.dispose();
  }
}
