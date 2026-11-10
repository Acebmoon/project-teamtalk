import { redirect } from "next/navigation";
import { criarServidor } from "../supabase/servidor";
import { avaliarSessao } from "./verificar-sessao";

export async function carregarInicio() {
  const supabase = await criarServidor();
  const { decisao, usuario } = await avaliarSessao(supabase);
  if (decisao !== "seguir" || !usuario)
    redirect(decisao === "acesso-negado" ? "/login?erro=acesso" : "/login");

  const { data: perfil } = await supabase.from("users")
    .select("display_name")
    .eq("id", usuario.id)
    .single();

  return { nome: perfil?.display_name ?? usuario.email ?? "Usuário" };
}
