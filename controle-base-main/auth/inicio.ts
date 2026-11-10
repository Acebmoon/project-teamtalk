import { redirect } from "next/navigation";
import { TelaInicial } from "@design/telas/inicio";
import { sair } from "./sair";
import { verificarSessao } from "./verificar-sessao";

export async function mostrarInicio() {
  const { decisao, supabase, usuario } = await verificarSessao();
  if (decisao !== "seguir" || !usuario)
    redirect(decisao === "acesso-negado" ? "/login?erro=acesso" : "/login");

  const { data: perfil } = await supabase.from("users")
    .select("display_name")
    .eq("id", usuario.id)
    .single();

  return TelaInicial({ nome: perfil?.display_name ?? usuario.email ?? "Usuário", sair });
}
