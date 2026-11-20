import type { EventoAuditoria, FiltrosAuditoria, Pagina } from "@controle/admin/liberacao/contratos";
import { PaginadorLiberacao } from "./admin-liberacao-comum";

export function TelaAuditoriaAdmin({ filtros, lista }: { filtros: FiltrosAuditoria; lista: Pagina<EventoAuditoria> }) {
  const horario = new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "medium", timeZone: "UTC" });
  return <main className="liberacao"><h1>Auditoria administrativa</h1>
    <p>Eventos de grupos e de outras operações administrativas, em ordem da mais recente. Horários em UTC.</p>
    <section className="liberacao-bloco"><h2>Filtrar eventos</h2>
      <form method="get" className="formulario">
        <label htmlFor="acao-audit">Ação exata (opcional)</label><input id="acao-audit" name="acao" defaultValue={filtros.acao} maxLength={80} placeholder="release_group.member_added" />
        <label htmlFor="ator-audit">ID do administrador (opcional)</label><input id="ator-audit" name="ator" defaultValue={filtros.ator} maxLength={36} />
        <label htmlFor="alvo-audit">ID do usuário alvo (opcional)</label><input id="alvo-audit" name="alvo" defaultValue={filtros.alvo} maxLength={36} />
        <label htmlFor="desde-audit">Data inicial</label><input id="desde-audit" type="date" name="desde" defaultValue={filtros.desde?.slice(0, 10)} />
        <label htmlFor="ate-audit">Data final</label><input id="ate-audit" type="date" name="ate" defaultValue={filtros.ate?.slice(0, 10)} />
        <input type="hidden" name="limite" value={filtros.limite} /><button>Filtrar auditoria</button><a href="/admin/auditoria">Limpar filtros</a>
      </form>
    </section>
    <section className="liberacao-bloco" aria-labelledby="eventos-titulo"><h2 id="eventos-titulo">Eventos</h2>
      {lista.itens.length === 0 && <p>Nenhum evento encontrado.</p>}
      <ol className="liberacao-lista">{lista.itens.map((evento) => <li key={evento.id}>
        <h3>{evento.action}</h3><p><time dateTime={evento.created_at}>{horario.format(new Date(evento.created_at))} UTC</time> · Evento {evento.id}</p>
        <dl><dt>Ator</dt><dd>{evento.actor_id ?? "Conta removida"}</dd><dt>Usuário alvo</dt><dd>{evento.target_user_id ?? "Sem alvo individual"}</dd></dl>
        <details><summary>Detalhes do evento</summary><pre>{JSON.stringify(evento.details, null, 2)}</pre></details>
      </li>)}</ol><PaginadorLiberacao dados={lista} caminho="/admin/auditoria" filtros={filtros} />
    </section>
  </main>;
}
