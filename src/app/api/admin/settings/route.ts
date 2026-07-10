import { NextResponse } from "next/server";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { isSafeLinkUrl } from "@/lib/links/isSafeLinkUrl";

type SocialUpdateItem = {
  key: string;
  label: string;
  url: string;
};

type UpdateSettingsBody = {
  brand_name?: string;
  bio?: string;
  social?: SocialUpdateItem[];
  affiliate_email?: string;
  affiliate_label?: string;
};

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function GET() {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "설정을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ settings: data });
}

export async function PATCH(request: Request) {
  let body: UpdateSettingsBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "잘못된 JSON 형식입니다" }, { status: 400 });
  }

  if (body.affiliate_email !== undefined && !isValidEmail(body.affiliate_email)) {
    return NextResponse.json({ error: "이메일 형식이 올바르지 않습니다" }, { status: 400 });
  }

  if (body.social !== undefined) {
    if (!Array.isArray(body.social)) {
      return NextResponse.json({ error: "social은 배열이어야 합니다" }, { status: 400 });
    }
    for (const item of body.social) {
      if (!isSafeLinkUrl(item.url)) {
        return NextResponse.json(
          { error: `허용되지 않는 URL 형식입니다: ${item.key}` },
          { status: 400 },
        );
      }
    }
  }

  const updates: Record<string, unknown> = {};
  if (body.brand_name !== undefined) updates.brand_name = body.brand_name;
  if (body.bio !== undefined) updates.bio = body.bio;
  if (body.social !== undefined) updates.social = body.social;
  if (body.affiliate_email !== undefined) updates.affiliate_email = body.affiliate_email;
  if (body.affiliate_label !== undefined) updates.affiliate_label = body.affiliate_label;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "변경할 필드가 없습니다" }, { status: 400 });
  }

  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("site_settings")
    .update(updates)
    .eq("id", "default")
    .select()
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "설정을 찾을 수 없습니다" }, { status: 404 });
  }

  return NextResponse.json({ settings: data });
}
