import type { Conta, FiltrosContas, ListaContas, StatusConta } from "@controle/admin/contratos";
import { FormularioCadastro, FormularioOperacao, type AcaoFormulario } from "./admin-formularios";

const ROTULOS: Record<StatusConta, string> = {
  pending: "Pendente", active: "Ativa", blocked: "Bloqueada", disabled: "Desativada",
};

function paginaContas(filtros: FiltrosContas, pagina: number) {
  const busca = new URLSearchParams({ pagina: String(pagina), limite: String(filtros.limite) });
  if (filtros.busca) busca.set("busca", filtros.busca);
  if (filtros.status) busca.set("status", filtros.status);
  return `/admin?${busca}`;
}

export function TelaAdmin({ nome, filtros, lista, criarConta }: {
  nome: string; filtros: FiltrosContas; lista: ListaContas; criarConta: AcaoFormulario;
}) {
  return <main className="pagina admin-pagina">
    <section className="painel admin-painel" aria-labelledby="titulo-admin">
      <a href="/">Voltar ao início</a>
      <h1 id="titulo-admin">Painel da TI</h1>
      <nav aria-label="Administração"><a href="/admin/grupos">Grupos de liberação</a> · <a href="/admin/auditoria">Auditoria</a></nav>
      <p>Olá, <strong>{nome}</strong>. Gerencie as contas da equipe.</p>
      <details className="admin-cadastro">
        <summary>Cadastrar uma conta</summary>
        <FormularioCadastro criarConta={criarConta} />
      </details>
      <h2>Contas cadastradas</h2>
      <form action="/admin" method="get" className="formulario" role="search">
        <label htmlFor="busca-conta">Nome ou e-mail</label>
        <input id="busca-conta" name="busca" defaultValue={filtros.busca} maxLength={100} type="search" />
        <label htmlFor="filtro-status">Estado da conta</label>
        <select id="filtro-status" name="status" defaultValue={filtros.status ?? ""}>
          <option value="">Todos os estados</option>
          {Object.entries(ROTULOS).map(([valor, rotulo]) => <option key={valor} value={valor}>{rotulo}</option>)}
        </select>
        <button type="submit">Consultar contas</button>
      </form>
      <p role="status">{lista.total} conta(s) encontrada(s).</p>
      {lista.contas.length ? <ul className="admin-lista">
        {lista.contas.map((conta) => <li key={conta.id}>
          <a href={`/admin/contas/${conta.id}`}><strong>{conta.display_name}</strong><span>{conta.email}</span></a>
          <span className="admin-status">{ROTULOS[conta.status]}</span>
          <p>{conta.role === "it_admin" ? "Admin TI" : "Funcionário"}
            {conta.must_change_password ? " · Troca de senha pendente" : ""}</p>
        </li>)}
      </ul> : <p>Nenhuma conta nesta página. Ajuste a busca ou volte à página anterior.</p>}
      <nav className="admin-paginacao" aria-label="Páginas de contas">
        {lista.pagina > 1 && <a href={paginaContas(filtros, lista.pagina - 1)}>Anterior</a>}
        <span>Página {lista.pagina}</span>
        {lista.pagina * lista.limite < lista.total && <a href={paginaContas(filtros, lista.pagina + 1)}>Próxima</a>}
      </nav>
    </section>
  </main>;
}

export function TelaContaAdmin({ conta, propriaConta, gerirConta }: {
  conta: Conta; propriaConta: boolean; gerirConta: AcaoFormulario;
}) {
  return <main className="pagina admin-pagina">
    <section className="painel admin-painel" aria-labelledby="titulo-conta">
      <a href="/admin">Voltar às contas</a>
      <h1 id="titulo-conta">{conta.display_name}</h1>
      <dl className="admin-dados">
        <dt>E-mail</dt><dd>{conta.email}</dd>
        <dt>Perfil</dt><dd>{conta.role === "it_admin" ? "Admin TI" : "Funcionário"}</dd>
        <dt>Estado</dt><dd>{ROTULOS[conta.status]}</dd>
        <dt>Troca de senha obrigatória</dt><dd>{conta.must_change_password ? "Sim" : "Não"}</dd>
        <dt>Cadastro</dt><dd><time dateTime={conta.created_at}>{new Date(conta.created_at).toLocaleString("pt-BR", { timeZone: "UTC" })} UTC</time></dd>
      </dl>
      {propriaConta ? <p>Para administrar sua própria conta, utilize outra conta Admin TI.</p> : <>
        <h2>Gerenciar acesso</h2>
        <p>Bloquear ou desativar impede o acesso. A desativação mantém o histórico e pode ser revertida pela TI.</p>
        {conta.status !== "active" && <FormularioOperacao id={conta.id} operacao="reativar" rotulo="Ativar ou reativar conta" gerirConta={gerirConta} />}
        {conta.status !== "blocked" && conta.status !== "disabled" && <FormularioOperacao id={conta.id} operacao="bloquear" rotulo="Bloquear conta" gerirConta={gerirConta} />}
        {conta.status !== "disabled" && <FormularioOperacao id={conta.id} operacao="desativar" rotulo="Desativar conta" gerirConta={gerirConta} />}
        <h2>Redefinir senha</h2>
        <p>A redefinição preserva o estado anterior da conta e exige a troca da senha provisória.</p>
        <FormularioOperacao id={conta.id} operacao="redefinir-senha" rotulo="Redefinir senha provisória" gerirConta={gerirConta} />
      </>}
    </section>
  </main>;
}

export function TelaErroAdmin({ mensagem }: { mensagem: string }) {
  return <main className="pagina"><section className="painel">
    <h1>Gestão de contas</h1><p className="erro" role="alert">{mensagem}</p><a href="/admin">Voltar ao painel</a>
  </section></main>;
}
