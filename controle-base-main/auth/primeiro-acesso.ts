import { redirect } from "next/navigation";
import { criarServidor } from "../supabase/servidor";
import { avaliarSessao } from "./verificar-sessao";

export async function carregarPrimeiroAcesso() {
  const supabase = await criarServidor();
  const { decisao, usuario } = await avaliarSessao(supabase);
  if (decisao === "seguir") redirect("/");
  if (decisao === "acesso-negado") redirect("/login?erro=acesso");
  if (decisao === "sessao-vencida") redirect("/login?erro=sessao");
  if (decisao !== "trocar-senha" || !usuario) redirect("/login");
  return { email: usuario.email ?? "" };
}

export function mensagemDeErroTroca(erro?: string) {
  switch (erro) {
    case "curta": return "A nova senha deve ter pelo menos 10 caracteres.";
    case "longa": return "A nova senha é muito longa (máximo de 72 bytes).";
    case "confirmacao": return "As senhas digitadas não são iguais.";
    case "igual": return "A nova senha deve ser diferente da senha provisória.";
    case "falha": return "Não foi possível alterar a senha. Tente novamente.";
    default: return "";
  }
}
