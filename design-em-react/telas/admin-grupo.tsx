import type { AcaoLiberacao, Grupo, Membro, Pagina, UsuarioGrupo } from "@controle/admin/liberacao/contratos";
import { PaginadorLiberacao } from "./admin-liberacao-comum";
import { FormularioAlterarGrupo } from "./admin-liberacao-formularios";

const status: Record<string, string> = { pending: "Pendente", active: "Ativo", blocked: "Bloqueado", disabled: "Desativado" };
export function TelaGrupoAdmin({ grupo, membros, usuarios, busca, alterar }: {
  grupo: Grupo; membros: Pagina<Membro>; usuarios: Pagina<UsuarioGrupo>; busca: string; alterar: AcaoLiberacao;
}) {
  const caminho = `/admin/grupos/${grupo.id}`;
  return <main className="liberacao"><a href="/admin/grupos">Voltar aos grupos</a><h1>{grupo.name}</h1>
    {grupo.description && <p>{grupo.description}</p>}
    <section className="liberacao-bloco" aria-labelledby="estado-titulo"><h2 id="estado-titulo">{grupo.is_enabled ? "Grupo habilitado" : "Grupo desabilitado"}</h2>
      <p>{grupo.is_enabled ? "Desabilitar bloqueia os funcionários que dependem somente deste grupo." : "Habilitar permite acesso aos participantes ativos, após a troca da senha provisória."}</p>
      <FormularioAlterarGrupo acao={alterar} grupoId={grupo.id} dados={{ acao: grupo.is_enabled ? "desabilitar" : "habilitar" }}
        rotulo={grupo.is_enabled ? "Desabilitar grupo" : "Habilitar grupo"} />
    </section>
    <section className="liberacao-bloco" aria-labelledby="membros-titulo"><h2 id="membros-titulo">Participantes</h2>
      <p>Remover a última participação em grupo habilitado bloqueia o acesso do funcionário.</p>
      {membros.itens.length === 0 && <p>Nenhum participante nesta página.</p>}
      <ul className="liberacao-lista">{membros.itens.map((membro) => <li key={membro.user_id}>
        <h3>{membro.usuario.display_name}</h3><p>{membro.usuario.email} · {status[membro.usuario.status] ?? membro.usuario.status}</p>
        <FormularioAlterarGrupo acao={alterar} grupoId={grupo.id} dados={{ acao: "remover", usuarioId: membro.user_id }} rotulo={`Remover ${membro.usuario.display_name}`} />
      </li>)}</ul>
      <PaginadorLiberacao dados={membros} caminho={caminho} filtros={{ busca, paginaUsuarios: usuarios.pagina }} titulo="Páginas de participantes" />
    </section>
    <section className="liberacao-bloco" aria-labelledby="incluir-titulo"><h2 id="incluir-titulo">Incluir usuários</h2>
      <p>Incluir em um grupo não ativa contas pendentes, bloqueadas ou desativadas.</p>
      <form method="get" className="formulario"><label htmlFor="busca-usuario">Buscar por nome ou e-mail</label>
        <input id="busca-usuario" name="busca" defaultValue={busca} maxLength={100} /><button>Buscar usuários</button>
      </form>
      {usuarios.itens.length === 0 && <p>Nenhum usuário encontrado.</p>}
      <ul className="liberacao-lista">{usuarios.itens.map((usuario) => <li key={usuario.id}>
        <h3>{usuario.display_name}</h3><p>{usuario.email} · {status[usuario.status] ?? usuario.status}</p>
        <FormularioAlterarGrupo acao={alterar} grupoId={grupo.id} dados={{ acao: "incluir", usuarioId: usuario.id }} rotulo={`Incluir ${usuario.display_name}`} />
      </li>)}</ul>
      <PaginadorLiberacao dados={usuarios} caminho={caminho} parametro="paginaUsuarios" filtros={{ busca, pagina: membros.pagina }} titulo="Páginas de usuários" />
    </section>
  </main>;
}
