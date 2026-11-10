"use server";

import { redirect } from "next/navigation";
import { decidirAcesso } from "./decidir-acesso";
import { criarServidor } from "../supabase/servidor";

export async function entrar(formulario: FormData): Promise<void> {
  const campoEmail = formulario.get("usuario");
  const campoSenha = formulario.get("senha");
  const email = typeof campoEmail === "string" ? campoEmail.trim() : "";
  const senha = typeof campoSenha === "string" ? campoSenha : "";
  if (!email || !senha) redirect("/login?erro=credenciais");

  const supabase = await criarServidor();
  const { error } = await supabase.auth.signInWithPassword({ email, password: senha });
  if (error) redirect("/login?erro=credenciais");

  const { data: usuario } = await supabase.auth.getUser();
  const user = usuario?.user;
  const { data: verificacao } = await supabase.auth.getClaims();
  const claims = verificacao?.claims;
  const { data: autorizado, error: erroAcesso } = await supabase.rpc("is_active_authorized_user");
  const decisao = decidirAcesso({
    usuarioValido: !!user,
    autorizado: !erroAcesso && autorizado === true,
    amr: claims?.amr,
    agora: Date.now() / 1000,
    limiteHoras: Number(process.env.SESSAO_MAX_HORAS ?? 12),
  });

  if (decisao !== "seguir") {
    await supabase.auth.signOut({ scope: "local" });
    redirect(decisao === "acesso-negado" ? "/login?erro=acesso" : "/login?erro=sessao");
  }

  redirect("/");
}
