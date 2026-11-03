import type { Metadata, Viewport } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

// Inter에는 한글이 없어 한글은 globals.css에 적은 시스템 글꼴로 보인다.
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DecisionFlow",
  description: "회의나 대화 음성을 분석해 결정 사항, 미해결 문제, AI 대안과 추천 결론을 담은 의사결정 보고서를 만듭니다.",
};

export const viewport: Viewport = {
  themeColor: "#ececeb",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="ko"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
