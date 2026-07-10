import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

/**
 * 통계 수동 초기화 — events 테이블의 모든 행을 삭제한다.
 * Supabase JS 클라이언트는 WHERE 없는 delete를 허용하지 않으므로
 * 항상 참인 조건(`id is not null` — id는 PK라 항상 non-null)으로 전체 삭제한다.
 */
export async function DELETE() {
  const supabase = createServiceSupabaseClient();
  const { error } = await supabase.from("events").delete().not("id", "is", null);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
