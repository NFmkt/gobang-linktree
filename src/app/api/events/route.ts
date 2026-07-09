import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";

type EventRequestBody = {
  type?: string;
  link_id?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
};

const VALID_TYPES = new Set(["pageview", "click"]);

export async function POST(request: Request) {
  let body: EventRequestBody;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }

  if (!body.type || !VALID_TYPES.has(body.type)) {
    return NextResponse.json(
      { error: "type must be 'pageview' or 'click'" },
      { status: 400 },
    );
  }
  if (body.type === "click" && !body.link_id) {
    return NextResponse.json(
      { error: "link_id is required for click events" },
      { status: 400 },
    );
  }

  const supabase = await createServerSupabaseClient();
  const { error } = await supabase.from("events").insert({
    type: body.type,
    link_id: body.link_id ?? null,
    referrer: body.referrer ?? null,
    utm_source: body.utm_source ?? null,
    utm_medium: body.utm_medium ?? null,
    utm_campaign: body.utm_campaign ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return new NextResponse(null, { status: 204 });
}
