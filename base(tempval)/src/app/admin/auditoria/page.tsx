import { exigirAdminTI } from "@controle/auth/exigir-admin-ti";
import { carregarAuditoria, erroPaginaLiberacao, type ParametrosLiberacao } from "@controle/admin/liberacao/painel";
import { TelaAuditoriaAdmin } from "@design/telas/admin-auditoria";
import { TelaErroLiberacao } from "@design/telas/admin-liberacao-comum";

export default async function PaginaAuditoria({ searchParams }: { searchParams: ParametrosLiberacao }) {
  try {
    const acesso = await exigirAdminTI();
    const dados = await carregarAuditoria(acesso, searchParams);
    return <TelaAuditoriaAdmin {...dados} />;
  } catch (erro) { return <TelaErroLiberacao mensagem={erroPaginaLiberacao(erro)} />; }
}
