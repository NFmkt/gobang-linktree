import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type RouteParams = { params: Promise<{ id: string }> };

type UpdateLinkBody = {
  title?: string;
  url?: string;
  icon?: string;
  subtitle?: string | null;
  thumbnail?: string | null;
  active?: boolean;
};

export async function PATCH(request: Request, { params }: RouteParams) {
  const { id } = await params;

  let body: UpdateLinkBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.title !== undefined) updates.title = body.title;
  if (body.url !== undefined) updates.url = body.url;
  if (body.icon !== undefined) updates.icon = body.icon;
  if (body.subtitle !== undefined) updates.subtitle = body.subtitle;
  if (body.thumbnail !== undefined) updates.thumbnail = body.thumbnail;
  if (body.active !== undefined) updates.active = body.active;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경할 필드가 없습니다" }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("links")
    .update(updates)
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ link: data });
}

export async function DELETE(_request: Request, { params }: RouteParams) {
  const { id } = await params;

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("links")
    .delete()
    .eq("id", id)
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "링크를 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
