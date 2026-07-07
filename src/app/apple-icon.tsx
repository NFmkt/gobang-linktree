import { ImageResponse } from "next/og";

/**
 * iOS 홈스크린 아이콘.
 *
 * `src/app/icon.svg`(브라우저 탭 파비콘)와 동일한 GYI 틸 마크를
 * 180x180 PNG로 재현한다. 마크 자체는 텍스트가 없는 순수 도형이라
 * Satori 기본 폰트로도 두부 현상 없이 렌더된다.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#14B8A6",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
          <path
            d="M8.5 16.5 16 10l7.5 6.5"
            stroke="#FFFFFF"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M10.75 15.25V23h10.5v-7.75"
            stroke="#FFFFFF"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M13.75 23v-4.75h4.5V23"
            stroke="#FFFFFF"
            strokeWidth={2.6}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    ),
    { ...size },
  );
}
