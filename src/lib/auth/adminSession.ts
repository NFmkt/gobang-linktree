const SESSION_LABEL = "gobang-admin-session-v1";

function getAdminPassword(): string {
  const password = process.env.ADMIN_PASSWORD;
  if (!password) {
    throw new Error(
      "ADMIN_PASSWORD 환경변수가 설정되지 않았습니다. .env.example을 참고해 .env.local을 구성하세요.",
    );
  }
  return password;
}

/**
 * 상수 시간 문자열 비교 — 타이밍 공격 방지.
 * 길이가 다르면 즉시 false (길이 자체는 비밀이 아니므로 조기 반환해도 안전).
 */
export function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * ADMIN_PASSWORD를 키로 한 결정적 HMAC 값을 "세션 토큰"으로 쓴다.
 * 비밀번호를 아는 사람만 같은 토큰을 재생성할 수 있어, 별도 세션 저장소 없이도
 * httpOnly 쿠키에 넣어 "로그인 상태"를 증명할 수 있다.
 * Web Crypto API(crypto.subtle) 사용 — Node.js 전용 crypto 모듈은 Edge 런타임에서
 * 동작하지 않으므로 Next.js Middleware와 호환되도록 반드시 이 API를 쓴다.
 */
export async function createAdminSessionToken(): Promise<string> {
  return hmacHex(getAdminPassword(), SESSION_LABEL);
}

export async function verifyAdminSessionToken(
  token: string | undefined | null,
): Promise<boolean> {
  if (!token) return false;
  const expected = await createAdminSessionToken();
  return constantTimeEqual(token, expected);
}
