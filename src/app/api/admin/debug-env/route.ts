import { createHash } from "node:crypto";
import { NextResponse } from "next/server";

// 임시 진단용 — 키 값 자체는 절대 반환하지 않고 형태(길이/구조)와 해시(비가역)만 확인한다.
// 문제 해결 후 즉시 삭제할 것.
export async function GET() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

  const describe = (key: string) => ({
    present: key.length > 0,
    length: key.length,
    dotCount: (key.match(/\./g) ?? []).length,
    hasWhitespace: /\s/.test(key),
    startsWithEyJ: key.startsWith("eyJ"),
    sha256: key.length > 0 ? createHash("sha256").update(key).digest("hex") : null,
  });

  return NextResponse.json({
    url: { present: url.length > 0, value: url },
    anon: describe(anon),
    service: describe(service),
  });
}
