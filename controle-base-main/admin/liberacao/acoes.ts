"use server";

import { revalidatePath } from "next/cache";
import { exigirAdminTI } from "../../auth/exigir-admin-ti";
import { erroSeguro } from "../erros";
import type { EstadoLiberacao } from "./contratos";
import { criarServicoLiberacao } from "./servico";

export async function criarGrupo(_estado: EstadoLiberacao, formulario: FormData): Promise<EstadoLiberacao> {
  try {
    const acesso = await exigirAdminTI();
    const servico = criarServicoLiberacao(acesso);
    const resultado = await servico.criarGrupo({ nome: formulario.get("nome"), descricao: formulario.get("descricao") ?? undefined });
    revalidatePath("/admin/grupos");
    revalidatePath("/admin/auditoria");
    return { status: 201, sucesso: "Grupo criado desabilitado. Inclua os participantes antes de habilitá-lo.", grupoId: resultado.grupo.id };
  } catch (erro) {
    const seguro = erroSeguro(erro);
    return { status: seguro.status, erro: seguro.message };
  }
}
export async function alterarGrupo(_estado: EstadoLiberacao, formulario: FormData): Promise<EstadoLiberacao> {
  try {
    const acesso = await exigirAdminTI();
    const acao = formulario.get("acao");
    const resultado = await criarServicoLiberacao(acesso).alterarGrupo(formulario.get("grupoId"), {
      acao, ...(acao === "incluir" || acao === "remover" ? { usuarioId: formulario.get("usuarioId") } : {}),
    });
    revalidatePath("/admin/grupos");
    revalidatePath(`/admin/grupos/${resultado.grupo.id}`);
    revalidatePath("/admin/auditoria");
    return { status: 200, sucesso: resultado.alterado ? "Alteração salva e registrada na auditoria." : "O grupo já estava nesse estado; nenhuma alteração foi necessária." };
  } catch (erro) {
    const seguro = erroSeguro(erro);
    return { status: seguro.status, erro: seguro.message };
  }
}
