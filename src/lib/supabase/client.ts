import { createBrowserClient } from "@supabase/ssr";

/**
 * 브라우저(클라이언트 컴포넌트)에서 사용하는 Supabase 클라이언트 팩토리.
 *
 * NEXT_PUBLIC_* 환경변수가 없으면 즉시 명확한 에러를 던진다.
 * 이 태스크(S0)에서는 라이브 연결을 검증하지 않는다 — 실제 키는 아직 없다.
 */
export function createBrowserSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다. .env.example을 참고해 .env.local을 구성하세요.",
    );
  }
  if (!anonKey) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다. .env.example을 참고해 .env.local을 구성하세요.",
    );
  }

  return createBrowserClient(url, anonKey);
}
