import type { SupabaseClient } from "@supabase/supabase-js";
import { decidirAcesso } from "./decidir-acesso";

type EstadoAcesso = {
  authorized?: boolean;
  must_change_password?: boolean;
  it_admin?: boolean;
};

export async function avaliarSessao(supabase: SupabaseClient) {
  const { data: usuario } = await supabase.auth.getUser();
  const user = usuario?.user;
  if (!user) return { decisao: "login" as const, usuario: null, ehAdmin: false };

  const { data: verificacao } = await supabase.auth.getClaims();
  const { data, error } = await supabase.rpc("get_access_state");
  const estado = data as EstadoAcesso | null;
  const decisao = decidirAcesso({
    usuarioValido: true,
    autorizado: !error && estado?.authorized === true,
    precisaTrocarSenha: !error && estado?.must_change_password === true,
    amr: verificacao?.claims?.amr,
    agora: Date.now() / 1000,
    limiteHoras: Number(process.env.SESSAO_MAX_HORAS) || 12,
  });

  return { decisao, usuario: user, ehAdmin: !error && estado?.it_admin === true };
}
