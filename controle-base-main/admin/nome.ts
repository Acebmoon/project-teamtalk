import type { SupabaseClient } from "@supabase/supabase-js";

export async function carregarNomeAdmin(supabase: SupabaseClient, id: string, email?: string) {
  const { data } = await supabase.from("users")
    .select("display_name").eq("id", id).single();
  return data?.display_name ?? email ?? "Usuário";
}
