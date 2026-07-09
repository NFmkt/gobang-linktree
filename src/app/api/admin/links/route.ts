import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";

type CreateLinkBody = {
  title?: string;
  url?: string;
  icon?: string;
  subtitle?: string;
  thumbnail?: string;
  active?: boolean;
  order?: number;
};

export async function GET() {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("links")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ links: data ?? [] });
}

export async function POST(request: Request) {
  let body: CreateLinkBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.title || !body.url || !body.icon || typeof body.order !== "number") {
    return NextResponse.json(
      { error: "title, url, icon, order는 필수입니다" },
      { status: 400 },
    );
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("links")
    .insert({
      id: crypto.randomUUID(),
      title: body.title,
      url: body.url,
      icon: body.icon,
      subtitle: body.subtitle ?? null,
      thumbnail: body.thumbnail ?? null,
      active: body.active ?? true,
      order: body.order,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ link: data }, { status: 201 });
}
