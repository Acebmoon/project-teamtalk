"use client";

import { useActionState } from "react";
import type { AcaoLiberacao, AlteracaoGrupo, EstadoLiberacao } from "@controle/admin/liberacao/contratos";

function Feedback({ estado }: { estado: EstadoLiberacao }) {
  return <>{estado.erro && <p className="erro" role="alert">{estado.erro}</p>}
    {estado.sucesso && <p role="status">{estado.sucesso}</p>}
    {estado.grupoId && <a href={`/admin/grupos/${estado.grupoId}`}>Gerenciar o grupo criado</a>}</>;
}
export function FormularioCriarGrupo({ acao }: { acao: AcaoLiberacao }) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return <form action={enviar} className="formulario">
    <label htmlFor="nome-grupo">Nome do grupo</label>
    <input id="nome-grupo" name="nome" required maxLength={100} autoComplete="off" />
    <label htmlFor="descricao-grupo">Descrição (opcional)</label>
    <input id="descricao-grupo" name="descricao" maxLength={500} />
    <button disabled={pendente}>{pendente ? "Criando…" : "Criar grupo desabilitado"}</button><Feedback estado={estado} />
  </form>;
}
export function FormularioAlterarGrupo({ acao, grupoId, dados, rotulo }: {
  acao: AcaoLiberacao; grupoId: string; dados: AlteracaoGrupo; rotulo: string;
}) {
  const [estado, enviar, pendente] = useActionState(acao, {});
  return <form action={enviar}>
    <input type="hidden" name="grupoId" value={grupoId} />
    <input type="hidden" name="acao" value={dados.acao} />
    {"usuarioId" in dados && <input type="hidden" name="usuarioId" value={dados.usuarioId} />}
    <button disabled={pendente}>{pendente ? "Salvando…" : rotulo}</button><Feedback estado={estado} />
  </form>;
}
