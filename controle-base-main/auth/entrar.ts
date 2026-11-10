"use server";

import { redirect } from "next/navigation";
import { decidirAcesso } from "./decidir-acesso";
import { criarServidor } from "../supabase/servidor";

export async function entrar(formulario: FormData): Promise<void> {
  const email = formulario.get("usuario");
  const senha = formulario.get("senha");
  if (typeof email !== "string" || !email.trim() || typeof senha !== "string" || !senha)
    redirect("/login?erro=credenciais");

  const supabase = await criarServidor();
  const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
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
