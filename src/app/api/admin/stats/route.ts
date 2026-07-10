import { NextResponse, type NextRequest } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { getStatsSummary } from "@/lib/stats/getStatsSummary";

/**
 * 선택 기간(from~to)의 통계 요약을 반환한다.
 * `from`/`to`는 쿼리 파라미터로 받는 ISO 날짜 문자열(`YYYY-MM-DD` 또는 전체 ISO 8601)이다.
 * 파싱/검증(누락, 형식 오류, from > to)은 이 라우트의 책임이다 —
 * getStatsSummary는 이 검증을 스스로 하지 않는다(B1 계약).
 */
export async function GET(request: NextRequest) {
  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  if (!fromParam || !toParam) {
    return NextResponse.json({ error: "from, to 쿼리 파라미터는 필수입니다" }, { status: 400 });
  }

  const from = new Date(fromParam);
  const to = new Date(toParam);

  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    return NextResponse.json(
      { error: "from, to는 올바른 날짜 형식(ISO 8601)이어야 합니다" },
      { status: 400 },
    );
  }

  if (from.getTime() > to.getTime()) {
    return NextResponse.json({ error: "from은 to보다 이후일 수 없습니다" }, { status: 400 });
  }

  const summary = await getStatsSummary(from, to);
  return NextResponse.json(summary);
}

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
