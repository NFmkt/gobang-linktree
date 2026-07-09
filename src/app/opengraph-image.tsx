import { readFileSync } from "fs";
import { join } from "path";
import { ImageResponse } from "next/og";
import { getSiteConfig } from "@/lib/site/getSiteConfig";

/**
 * 카카오톡/SNS 공유 미리보기 OG 이미지 (1200x630).
 *
 * @frontend-design 적용: 비비드 블루 테마 — 풀블리드 블루 배경 위에 떠있는
 * 반투명 라운드 도형(공개 히어로와 동일 아이덴티티), 흰 박스 안 bi.png 로고
 * (히어로 ProfileHeader와 동일 아이덴티티), "고방" 대형 헤딩 + 반투명 카드 bio.
 * 하드 오프셋 없는 소프트 감성.
 *
 * 한글 렌더링 주의: next/og(Satori)의 기본 폰트에는 한글 글리프가 없어
 * "고방"이 두부(□)로 나온다. Satori는 woff2를 파싱하지 못하므로,
 * `pretendard` 패키지의 비-woff2(.otf) 폰트 파일을 리포 안(src/app/fonts/)에
 * 복사해두고 fs.readFileSync로 읽어 fonts에 전달한다.
 *
 * 로고 렌더링 주의: Satori의 <img>는 상대 경로를 못 읽으므로 public/bi.png를
 * fs로 읽어 base64 data URI로 인라인한다(폰트와 동일한 fs 로드 패턴).
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
const logoDataUri = `data:image/png;base64,${readFileSync(
  join(process.cwd(), "public/bi.png"),
).toString("base64")}`;

export default async function OpengraphImage() {
  const siteConfig = await getSiteConfig();

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "#1B4DFF",
          fontFamily: "Pretendard",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* 떠있는 반투명 라운드 도형 (히어로와 동일 장식) */}
        <div
          style={{
            position: "absolute",
            top: -120,
            right: -100,
            width: 460,
            height: 300,
            background: "rgba(255,255,255,0.08)",
            borderRadius: "120px 120px 120px 40px",
            transform: "rotate(10deg)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -140,
            left: -80,
            width: 340,
            height: 240,
            background: "rgba(255,255,255,0.07)",
            borderRadius: "40px 120px 120px 120px",
            transform: "rotate(-8deg)",
          }}
        />

        {/* 코너 태그 */}
        <div
          style={{
            position: "absolute",
            top: 56,
            right: 56,
            display: "flex",
            alignItems: "center",
            padding: "10px 22px",
            background: "rgba(255,255,255,0.16)",
            border: "1px solid rgba(255,255,255,0.35)",
            borderRadius: 999,
            fontSize: 24,
            fontWeight: 600,
            color: "#FFFFFF",
          }}
        >
          gobang.kr
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 30 }}>
          {/* 흰 박스 + bi.png 로고 — ProfileHeader 히어로와 동일 아이덴티티 */}
          <div
            style={{
              display: "flex",
              width: 120,
              height: 120,
              flexShrink: 0,
              alignItems: "center",
              justifyContent: "center",
              background: "#FFFFFF",
              borderRadius: 30,
              padding: 18,
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={logoDataUri}
              alt=""
              width={84}
              height={84}
              style={{ objectFit: "contain" }}
            />
          </div>

          <div
            style={{
              fontSize: 116,
              fontWeight: 700,
              lineHeight: 1,
              color: "#FFFFFF",
              letterSpacing: -3,
            }}
          >
            {siteConfig.brandName}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignSelf: "flex-start",
            marginTop: 46,
            padding: "24px 34px",
            background: "rgba(255,255,255,0.14)",
            border: "1px solid rgba(255,255,255,0.3)",
            borderRadius: 22,
            fontSize: 40,
            fontWeight: 500,
            color: "rgba(255,255,255,0.94)",
          }}
        >
          {siteConfig.bio}
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
