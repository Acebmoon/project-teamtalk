import type { AcaoLiberacao, FiltrosGrupos, Grupo, Pagina } from "@controle/admin/liberacao/contratos";
import { PaginadorLiberacao } from "./admin-liberacao-comum";
import { FormularioCriarGrupo } from "./admin-liberacao-formularios";

export function TelaGruposAdmin({ filtros, lista, criar }: { filtros: FiltrosGrupos; lista: Pagina<Grupo>; criar: AcaoLiberacao }) {
  return <main className="liberacao"><h1>Grupos de liberação gradual</h1>
    <p>Fase 1: somente funcionários ativos em pelo menos um grupo habilitado acessam o sistema. A participação mantém as exigências de senha e sessão.</p>
    <section className="liberacao-bloco" aria-labelledby="novo-grupo"><h2 id="novo-grupo">Criar grupo</h2>
      <p>Novos grupos começam desabilitados.</p><FormularioCriarGrupo acao={criar} />
    </section>
    <section className="liberacao-bloco" aria-labelledby="lista-grupos"><h2 id="lista-grupos">Grupos cadastrados</h2>
      <form method="get" className="formulario"><label htmlFor="estado-grupo">Estado</label>
        <select id="estado-grupo" name="estado" defaultValue={filtros.estado ?? ""}>
          <option value="">Todos</option><option value="habilitado">Habilitado</option><option value="desabilitado">Desabilitado</option>
        </select><input type="hidden" name="limite" value={filtros.limite} /><button>Filtrar grupos</button>
      </form>
      {lista.itens.length === 0 && <p>Nenhum grupo encontrado.</p>}
      <ul className="liberacao-lista">{lista.itens.map((grupo) => <li key={grupo.id}>
        <h3><a href={`/admin/grupos/${grupo.id}`}>{grupo.name}</a></h3>
        <p>{grupo.is_enabled ? "Habilitado" : "Desabilitado"}</p>{grupo.description && <p>{grupo.description}</p>}
      </li>)}</ul><PaginadorLiberacao dados={lista} caminho="/admin/grupos" filtros={filtros} />
    </section>
  </main>;
}
