import { decidirAcesso } from "./decidir-acesso";
import { criarServidor } from "../supabase/servidor";

export async function verificarSessao() {
  const supabase = await criarServidor();
  const { data: usuario } = await supabase.auth.getUser();
  const user = usuario?.user;
  if (!user) return { decisao: "login" as const, supabase, usuario: null };

  const { data: verificacao } = await supabase.auth.getClaims();
  const claims = verificacao?.claims;
  const { data: autorizado, error } = await supabase.rpc("is_active_authorized_user");
  const decisao = decidirAcesso({
    usuarioValido: true,
    autorizado: !error && autorizado === true,
    amr: claims?.amr,
    agora: Date.now() / 1000,
    limiteHoras: Number(process.env.SESSAO_MAX_HORAS ?? 12),
  });

  return { decisao, supabase, usuario: user };
}
