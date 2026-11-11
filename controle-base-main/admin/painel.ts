import { redirect } from "next/navigation";
import { exigirAdminTI } from "../auth/exigir-admin-ti";
import { carregarNomeAdmin } from "./nome";

export async function carregarPainelAdmin() {
  const acesso = await exigirAdminTI();
  if (!acesso) redirect("/");
  const nome = await carregarNomeAdmin(acesso.supabase, acesso.usuario.id, acesso.usuario.email);
  return { nome };
}
