import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { SettingsForm } from "./SettingsForm";

export default async function AdminSettingsPage() {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("*")
    .eq("id", "default")
    .maybeSingle();

  if (error || !data) {
    return (
      <p className="text-[14px] text-[var(--color-danger)]">
        설정을 불러오지 못했습니다{error ? `: ${error.message}` : ""}
      </p>
    );
  }

  return <SettingsForm initialSettings={data} />;
}
