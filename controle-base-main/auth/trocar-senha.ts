"use server";

import { redirect } from "next/navigation";
import { criarServidor } from "../supabase/servidor";
import { avaliarSessao } from "./verificar-sessao";
import { validarNovaSenha } from "./validar-nova-senha";

export async function trocarSenha(formulario: FormData): Promise<void> {
  const supabase = await criarServidor();
  const { decisao } = await avaliarSessao(supabase);
  if (decisao === "seguir") redirect("/");
  if (decisao === "login") redirect("/login");
  if (decisao !== "trocar-senha") {
    await supabase.auth.signOut({ scope: "local" });
    redirect(decisao === "acesso-negado" ? "/login?erro=acesso" : "/login?erro=sessao");
  }

  const campoSenha = formulario.get("senha");
  const campoConfirmacao = formulario.get("confirmacao");
  const senha = typeof campoSenha === "string" ? campoSenha : "";
  const confirmacao = typeof campoConfirmacao === "string" ? campoConfirmacao : "";
  const erroValidacao = validarNovaSenha(senha, confirmacao);
  if (erroValidacao) redirect(`/primeiro-acesso?erro=${erroValidacao}`);

  const { error } = await supabase.auth.updateUser({ password: senha });
  if (error) {
    const codigo = error.code === "same_password" ? "igual"
      : error.code === "weak_password" ? "curta" : "falha";
    redirect(`/primeiro-acesso?erro=${codigo}`);
  }

  const { error: erroSaida } = await supabase.auth.signOut({ scope: "global" });
  if (erroSaida) await supabase.auth.signOut({ scope: "local" });
  redirect("/login?aviso=senha-alterada");
}
