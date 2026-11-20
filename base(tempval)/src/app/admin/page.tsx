import { carregarPainelAdmin, mensagemErroPagina, type ParametrosPainel } from "@controle/admin/painel";
import { criarConta } from "@controle/admin/acoes";
import { TelaAdmin, TelaErroAdmin } from "@design/telas/admin";

export const dynamic = "force-dynamic";

export default async function PaginaAdmin({ searchParams }: { searchParams: ParametrosPainel }) {
  try {
    const dados = await carregarPainelAdmin(searchParams);
    return <TelaAdmin {...dados} criarConta={criarConta} />;
  } catch (erro) { return <TelaErroAdmin mensagem={mensagemErroPagina(erro)} />; }
}
