import { carregarContaAdmin, mensagemErroPagina } from "@controle/admin/painel";
import { gerirConta } from "@controle/admin/acoes";
import { TelaContaAdmin, TelaErroAdmin } from "@design/telas/admin";

export const dynamic = "force-dynamic";

export default async function PaginaContaAdmin({ params }: { params: Promise<{ id: string }> }) {
  try {
    const dados = await carregarContaAdmin(params);
    return <TelaContaAdmin {...dados} gerirConta={gerirConta} />;
  } catch (erro) { return <TelaErroAdmin mensagem={mensagemErroPagina(erro)} />; }
}
