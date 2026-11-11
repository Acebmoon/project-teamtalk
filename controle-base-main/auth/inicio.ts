import { redirect } from "next/navigation";
import { criarServidor } from "../supabase/servidor";
import { avaliarSessao } from "./verificar-sessao";

export async function carregarInicio() {
  const supabase = await criarServidor();
  const { decisao, usuario } = await avaliarSessao(supabase);
  if (decisao === "trocar-senha") redirect("/primeiro-acesso");
  if (decisao === "acesso-negado") redirect("/login?erro=acesso");
  if (decisao === "sessao-vencida") redirect("/login?erro=sessao");
  if (decisao !== "seguir" || !usuario) redirect("/login");

  const { data: perfil } = await supabase.from("users")
    .select("display_name")
    .eq("id", usuario.id)
    .single();

  return { nome: perfil?.display_name ?? usuario.email ?? "Usuário" };
}
