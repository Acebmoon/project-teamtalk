import { redirect } from "next/navigation";
import { carregarNomeAdmin } from "@controle/auth/admin";
import { exigirAdminTI } from "@controle/auth/exigir-admin-ti";
import { TelaAdmin } from "@design/telas/admin";

export default async function PaginaAdmin() {
  const acesso = await exigirAdminTI();
  if (!acesso) redirect("/");
  const nome = await carregarNomeAdmin(acesso.supabase, acesso.usuario.id, acesso.usuario.email);
  return <TelaAdmin nome={nome} />;
}
