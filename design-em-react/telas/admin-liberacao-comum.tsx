import type { ReactNode } from "react";
import type { Paginacao } from "@controle/admin/liberacao/contratos";

export function NavegacaoLiberacao({ children }: { children: ReactNode }) {
  return <><nav className="liberacao-nav" aria-label="Administração TI">
    <a href="/admin">Contas e painel</a><a href="/admin/grupos">Grupos de liberação</a><a href="/admin/auditoria">Auditoria</a>
  </nav>{children}</>;
}
export function TelaErroLiberacao({ mensagem }: { mensagem: string }) {
  return <main className="pagina"><section className="painel"><h1>Administração TI</h1>
    <p role="alert" className="erro">{mensagem}</p><a href="/admin/grupos">Voltar aos grupos</a></section></main>;
}
export function PaginadorLiberacao({ dados, caminho, filtros = {}, parametro = "pagina", titulo = "Páginas" }: {
  dados: Paginacao & { total: number }; caminho: string; filtros?: Record<string, string | number | undefined>;
  parametro?: string; titulo?: string;
}) {
  const paginas = Math.max(1, Math.ceil(dados.total / dados.limite));
  const link = (pagina: number) => {
    const parametros = new URLSearchParams();
    for (const [chave, valor] of Object.entries({ ...filtros, [parametro]: pagina }))
      if (valor !== undefined && valor !== "") parametros.set(chave, String(valor));
    return `${caminho}?${parametros}`;
  };
  return <nav className="liberacao-paginacao" aria-label={titulo}>
    {dados.pagina > 1 && <a href={link(dados.pagina - 1)}>Anterior</a>}
    <span>Página {dados.pagina} de {paginas} · {dados.total} registros</span>
    {dados.pagina < paginas && <a href={link(dados.pagina + 1)}>Próxima</a>}
  </nav>;
}
