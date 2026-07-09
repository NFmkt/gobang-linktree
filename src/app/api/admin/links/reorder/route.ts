import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type ReorderBody = {
  order?: string[];
};

export async function PATCH(request: Request) {
  let body: ReorderBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!Array.isArray(body.order) || body.order.length === 0) {
    return NextResponse.json({ error: "order는 id 배열이어야 합니다" }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();

  const results = await Promise.all(
    body.order.map((id, index) =>
      supabase.from("links").update({ order: index + 1 }).eq("id", id),
    ),
  );

  const failed = results.find((result) => result.error);
  if (failed?.error) {
    return NextResponse.json({ error: failed.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
