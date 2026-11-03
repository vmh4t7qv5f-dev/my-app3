import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // pdfkit은 자기 파일을 실행 중에 읽으므로 묶지 않고, 글꼴은 메일을 보내는 실행에 함께 싣는다.
  serverExternalPackages: ["pdfkit"],
  outputFileTracingIncludes: {
    "/api/jobs/\\[id\\]/analyze": ["./assets/fonts/**/*"],
  },
  // 링크가 유일한 접근 수단이므로 검색에 노출되거나 다른 사이트로 주소가 넘어가지 않게 한다.
  headers() {
    return [
      {
        source: "/r/:id",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
    ];
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
