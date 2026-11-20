import { exigirAdminTI } from "@controle/auth/exigir-admin-ti";
import { carregarGrupos, erroPaginaLiberacao, type ParametrosLiberacao } from "@controle/admin/liberacao/painel";
import { criarGrupo } from "@controle/admin/liberacao/acoes";
import { TelaGruposAdmin } from "@design/telas/admin-grupos";
import { TelaErroLiberacao } from "@design/telas/admin-liberacao-comum";

export default async function PaginaGrupos({ searchParams }: { searchParams: ParametrosLiberacao }) {
  try {
    const acesso = await exigirAdminTI();
    const dados = await carregarGrupos(acesso, searchParams);
    return <TelaGruposAdmin {...dados} criar={criarGrupo} />;
  } catch (erro) { return <TelaErroLiberacao mensagem={erroPaginaLiberacao(erro)} />; }
}
