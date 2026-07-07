import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";
import { SITE_CONFIG } from "@/lib/site/config";

/**
 * 카카오톡/SNS 공유 미리보기 OG 이미지 (1200x630).
 *
 * @frontend-design 적용: 비비드 블록 테마 — 크림 배경, GYI 틸 마크,
 * 2px 다크 테두리 + 하드 오프셋(블러 없는 6px 6px 0) 카드,
 * 라임은 한 곳(코너 태그)에만 절제해서 사용한다.
 *
 * 한글 렌더링 주의: next/og(Satori)의 기본 폰트에는 한글 글리프가 없어
 * "고방"이 두부(□)로 나온다. Satori는 woff2를 파싱하지 못하므로,
 * `pretendard` 패키지의 비-woff2(.otf) 폰트 파일을 리포 안(src/app/fonts/)에
 * 복사해두고 fs.readFileSync로 읽어 fonts에 전달한다. node_modules 경로를
 * 직접 참조하면 Vercel 서버리스 번들에 포함되지 않을 수 있어 피한다.
 */
export const runtime = "nodejs";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const fontDir = join(process.cwd(), "src/app/fonts");
const pretendardBold = readFileSync(join(fontDir, "Pretendard-Bold.otf"));
const pretendardSemiBold = readFileSync(
  join(fontDir, "Pretendard-SemiBold.otf"),
);
const pretendardRegular = readFileSync(
  join(fontDir, "Pretendard-Regular.otf"),
);

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px",
          background: "#FBFAF3",
          fontFamily: "Pretendard",
        }}
      >
        {/* 라임 코너 태그 — 유일한 라임 사용처 */}
        <div
          style={{
            position: "absolute",
            top: 48,
            right: 48,
            display: "flex",
            alignItems: "center",
            padding: "8px 18px",
            background: "#B9F227",
            border: "2px solid #14201E",
            borderRadius: 999,
            fontSize: 22,
            fontWeight: 600,
            color: "#14201E",
          }}
        >
          gobang.kr
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* GYI 틸 로고 마크 — ProfileHeader와 동일 아이덴티티 */}
          <div
            style={{
              display: "flex",
              width: 116,
              height: 116,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              background: "#14B8A6",
              border: "3px solid #14201E",
              borderRadius: 28,
              boxShadow: "6px 6px 0 #14201E",
              fontSize: 40,
              fontWeight: 700,
              color: "#FFFFFF",
              letterSpacing: -1,
            }}
          >
            {SITE_CONFIG.logoLabel}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            <div
              style={{
                fontSize: 108,
                fontWeight: 700,
                lineHeight: 1,
                color: "#14201E",
                letterSpacing: -2,
              }}
            >
              {SITE_CONFIG.brandName}
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            marginTop: 44,
            padding: "22px 32px",
            background: "#FFFFFF",
            border: "2px solid #14201E",
            borderRadius: 18,
            boxShadow: "6px 6px 0 #14201E",
            fontSize: 38,
            fontWeight: 500,
            color: "#3E4B48",
          }}
        >
          {SITE_CONFIG.bio}
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: "Pretendard", data: pretendardRegular, weight: 400, style: "normal" },
        { name: "Pretendard", data: pretendardSemiBold, weight: 600, style: "normal" },
        { name: "Pretendard", data: pretendardBold, weight: 700, style: "normal" },
      ],
    },
  );
}
