import { exigirAdminTI } from "@controle/auth/exigir-admin-ti";
import { carregarGrupo, erroPaginaLiberacao, type ParametrosLiberacao } from "@controle/admin/liberacao/painel";
import { alterarGrupo } from "@controle/admin/liberacao/acoes";
import { TelaGrupoAdmin } from "@design/telas/admin-grupo";
import { TelaErroLiberacao } from "@design/telas/admin-liberacao-comum";

export default async function PaginaGrupo({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: ParametrosLiberacao }) {
  try {
    const acesso = await exigirAdminTI();
    const dados = await carregarGrupo(acesso, params, searchParams);
    return <TelaGrupoAdmin {...dados} alterar={alterarGrupo} />;
  } catch (erro) { return <TelaErroLiberacao mensagem={erroPaginaLiberacao(erro)} />; }
}
