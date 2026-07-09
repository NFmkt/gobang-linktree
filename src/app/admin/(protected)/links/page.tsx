import { createServiceSupabaseClient } from "@/lib/supabase/server";
import type { Link } from "@/lib/links/types";
import { LinksManager } from "./LinksManager";

export default async function AdminLinksPage() {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("links")
    .select("*")
    .order("order", { ascending: true });

  if (error) {
    return (
      <p className="text-[14px] text-[var(--color-danger)]">
        링크를 불러오지 못했습니다: {error.message}
      </p>
    );
  }

  return <LinksManager initialLinks={(data ?? []) as Link[]} />;
}
