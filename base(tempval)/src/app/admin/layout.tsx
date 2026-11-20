import type { ReactNode } from "react";
import { exigirAdminTI } from "@controle/auth/exigir-admin-ti";
import { erroPaginaLiberacao } from "@controle/admin/liberacao/painel";
import { NavegacaoLiberacao, TelaErroLiberacao } from "@design/telas/admin-liberacao-comum";
import "@design/admin-liberacao.css";

export default async function LayoutAdmin({ children }: { children: ReactNode }) {
  try {
    await exigirAdminTI();
    return <NavegacaoLiberacao>{children}</NavegacaoLiberacao>;
  } catch (erro) { return <TelaErroLiberacao mensagem={erroPaginaLiberacao(erro)} />; }
}
