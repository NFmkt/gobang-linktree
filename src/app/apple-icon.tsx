import { ImageResponse } from "next/og";

/**
 * iOS 홈스크린 아이콘.
 *
 * `src/app/icon.svg`(브라우저 탭 파비콘)와 동일한 비비드 블루 하우스 마크를
 * 180x180 PNG로 재현한다. 마크는 fill 전용 도형이라 폰트 의존이 없다.
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
          background: "#1B4DFF",
        }}
      >
        <svg width="120" height="120" viewBox="0 0 32 32" fill="none">
          <path d="M16 6 26.5 14.8H5.5Z" fill="#FFFFFF" />
          <rect x="7.8" y="13.6" width="16.4" height="11.4" rx="2.6" fill="#FFFFFF" />
          <rect x="13.4" y="18" width="5.2" height="7" rx="1.4" fill="#1B4DFF" />
        </svg>
      </div>
    ),
    { ...size },
  );
}
