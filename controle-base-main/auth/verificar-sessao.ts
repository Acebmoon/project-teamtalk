import type { SupabaseClient } from "@supabase/supabase-js";
import { decidirAcesso } from "./decidir-acesso";

export async function avaliarSessao(supabase: SupabaseClient) {
  const { data: usuario } = await supabase.auth.getUser();
  const user = usuario?.user;
  if (!user) return { decisao: "login" as const, usuario: null };

  const { data: verificacao } = await supabase.auth.getClaims();
  const { data: autorizado, error } = await supabase.rpc("is_active_authorized_user");
  const decisao = decidirAcesso({
    usuarioValido: true,
    autorizado: !error && autorizado === true,
    amr: verificacao?.claims?.amr,
    agora: Date.now() / 1000,
    limiteHoras: Number(process.env.SESSAO_MAX_HORAS) || 12,
  });

  return { decisao, usuario: user };
}
