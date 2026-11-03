// 글자를 점으로 찍어 전광판처럼 보여 주는 장식 글자다. 화면 읽기 프로그램에는 원래 글자를 알려 준다.
const GLYPHS: Record<string, string[]> = {
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["010", "110", "010", "010", "010", "010", "111"],
  "2": ["01110", "10001", "00001", "00010", "00100", "01000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "10000", "11110", "00001", "00001", "11110"],
  "6": ["01110", "10000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00001", "01110"],
  I: ["111", "010", "010", "010", "010", "010", "111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  t: ["00100", "00100", "11111", "00100", "00100", "00100", "00011"],
};

const PITCH = 4;
const GAP = 1;
const DOT_OFFSET = 1.55;
const DOT_RADIUS = 1.8;
const ROW_COUNT = 7;

export function DotText({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const dots: { x: number; y: number }[] = [];
  let width = 0;

  for (const character of text) {
    const glyph = GLYPHS[character];
    if (!glyph) continue;
    glyph.forEach((row, rowIndex) => {
      Array.from(row).forEach((cell, columnIndex) => {
        if (cell === "1") {
          dots.push({
            x: width + columnIndex * PITCH + DOT_OFFSET,
            y: rowIndex * PITCH + DOT_OFFSET,
          });
        }
      });
    });
    width += glyph[0].length * PITCH + GAP;
  }

  const height = ROW_COUNT * PITCH;

  return (
    <svg
      role="img"
      aria-label={text}
      viewBox={`0 0 ${width} ${height}`}
      style={{ aspectRatio: `${width} / ${height}` }}
      className={className}
      fill="currentColor"
    >
      {dots.map((dot) => (
        <circle
          key={`${dot.x}-${dot.y}`}
          cx={dot.x}
          cy={dot.y}
          r={DOT_RADIUS}
        />
      ))}
    </svg>
  );
}
