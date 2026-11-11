"use server";

import { redirect } from "next/navigation";
import { criarServidor } from "../supabase/servidor";
import { avaliarSessao } from "./verificar-sessao";

export async function entrar(formulario: FormData): Promise<void> {
  const campoEmail = formulario.get("usuario");
  const campoSenha = formulario.get("senha");
  const email = typeof campoEmail === "string" ? campoEmail.trim() : "";
  const senha = typeof campoSenha === "string" ? campoSenha : "";
  if (!email || !senha) redirect("/login?erro=credenciais");

  const supabase = await criarServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) redirect("/login?erro=credenciais");

  const { decisao } = await avaliarSessao(supabase);
  if (decisao === "seguir") redirect("/");
  if (decisao === "trocar-senha") redirect("/primeiro-acesso");

  await supabase.auth.signOut({ scope: "local" });
  redirect(decisao === "acesso-negado" ? "/login?erro=acesso" : "/login?erro=sessao");
}
