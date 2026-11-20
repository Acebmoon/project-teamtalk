"use client";

import { useActionState } from "react";
import type { AcaoConta, EstadoFormulario } from "@controle/admin/contratos";

export type AcaoFormulario = (estado: EstadoFormulario, dados: FormData) => Promise<EstadoFormulario>;

function Resultado({ estado }: { estado: EstadoFormulario }) {
  return <div aria-live="polite">
    {estado.erro && <p className="erro" role="alert">{estado.erro}</p>}
    {estado.sucesso && <p role="status">{estado.sucesso}</p>}
  </div>;
}

export function FormularioCadastro({ criarConta }: { criarConta: AcaoFormulario }) {
  const [estado, acao, enviando] = useActionState(criarConta, {});
  return <form action={acao} className="formulario">
    <label htmlFor="cadastro-nome">Nome completo</label>
    <input id="cadastro-nome" name="nome" autoComplete="name" maxLength={120} required />
    <label htmlFor="cadastro-email">E-mail corporativo</label>
    <input id="cadastro-email" name="email" type="email" autoComplete="off" maxLength={254} required />
    <label htmlFor="cadastro-papel">Perfil</label>
    <select id="cadastro-papel" name="papel" defaultValue="employee">
      <option value="employee">Funcionário</option><option value="it_admin">Admin TI</option>
    </select>
    <label htmlFor="cadastro-status">Estado inicial</label>
    <select id="cadastro-status" name="status" defaultValue="pending">
      <option value="pending">Pendente de liberação</option><option value="active">Ativa</option>
    </select>
    <label htmlFor="cadastro-senha">Senha provisória</label>
    <input id="cadastro-senha" name="senha" type="password" autoComplete="new-password"
      minLength={10} maxLength={72} required aria-describedby="cadastro-regra" />
    <p id="cadastro-regra">Ao menos 10 caracteres, até 72 bytes. A senha será enviada ao e-mail corporativo com prazo para troca obrigatória.</p>
    <p>Contas ativas de funcionários também precisam pertencer a um grupo de liberação habilitado.</p>
    <Resultado estado={estado} />
    <button type="submit" disabled={enviando}>{enviando ? "Cadastrando…" : "Cadastrar conta"}</button>
  </form>;
}

export function FormularioOperacao({ id, operacao, rotulo, gerirConta }: {
  id: string; operacao: AcaoConta; rotulo: string; gerirConta: AcaoFormulario;
}) {
  const [estado, acao, enviando] = useActionState(gerirConta, {});
  return <form action={acao} className="formulario admin-operacao">
    <input type="hidden" name="id" value={id} /><input type="hidden" name="acao" value={operacao} />
    {operacao === "redefinir-senha" ? <>
      <label htmlFor="senha-redefinicao">Nova senha provisória</label>
      <input id="senha-redefinicao" name="senha" type="password" autoComplete="new-password"
        minLength={10} maxLength={72} required aria-describedby="regra-redefinicao" />
      <p id="regra-redefinicao">Ao menos 10 caracteres, até 72 bytes. A nova senha será enviada por e-mail com prazo para troca obrigatória.</p>
    </> : <label className="admin-confirmacao">
      <input type="checkbox" required /> Confirmo que desejo {rotulo.toLowerCase()}.
    </label>}
    <Resultado estado={estado} />
    <button type="submit" disabled={enviando}>{enviando ? "Processando…" : rotulo}</button>
  </form>;
}
