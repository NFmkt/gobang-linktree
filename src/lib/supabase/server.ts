import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient } from "@supabase/supabase-js";

/**
 * 서버 컴포넌트/라우트 핸들러에서 사용하는 Supabase 클라이언트 팩토리 (anon key, 쿠키 세션 연동).
 *
 * NEXT_PUBLIC_* 환경변수가 없으면 즉시 명확한 에러를 던진다.
 * 이 태스크(S0)에서는 라이브 연결을 검증하지 않는다 — 실제 키는 아직 없다.
 */
export async function createServerSupabaseClient() {
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

  const cookieStore = await cookies();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options);
          });
        } catch {
          // 서버 컴포넌트(읽기 전용 렌더링)에서 호출된 경우 무시.
          // 미들웨어/라우트 핸들러에서 세션이 갱신되므로 안전하다.
        }
      },
    },
  });
}

/**
 * 관리자(서버 전용) 작업을 위한 Supabase 서비스 롤 클라이언트 팩토리.
 * RLS를 우회하므로 절대 브라우저에 노출하지 말 것 (서버 전용 코드에서만 import).
 *
 * SUPABASE_SERVICE_ROLE_KEY가 없으면 즉시 명확한 에러를 던진다.
 */
export function createServiceSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL 환경변수가 설정되지 않았습니다. .env.example을 참고해 .env.local을 구성하세요.",
    );
  }
  if (!serviceRoleKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY 환경변수가 설정되지 않았습니다. 이 값은 서버 전용이며 절대 브라우저에 노출하면 안 됩니다.",
    );
  }

  return createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
