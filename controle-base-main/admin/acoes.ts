"use server";

import { revalidatePath } from "next/cache";
import { exigirAdminTI } from "../auth/exigir-admin-ti";
import type { EstadoFormulario } from "./contratos";
import { erroSeguro } from "./erros";
import { criarServicoContas } from "./servico";
import { validarId } from "./validacoes";

export async function criarConta(_estado: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  try {
    const acesso = await exigirAdminTI();
    await criarServicoContas(acesso).cadastrar({
      nome: formulario.get("nome"), email: formulario.get("email"),
      papel: formulario.get("papel"), status: formulario.get("status"), senha: formulario.get("senha"),
    });
    revalidatePath("/admin");
    return { sucesso: "Conta cadastrada e e-mail de primeiro acesso enviado. A senha provisória deverá ser trocada no prazo informado." };
  } catch (erro) { return { erro: erroSeguro(erro).message }; }
}

export async function gerirConta(_estado: EstadoFormulario, formulario: FormData): Promise<EstadoFormulario> {
  try {
    const acesso = await exigirAdminTI();
    const id = validarId(formulario.get("id"));
    const acao = formulario.get("acao");
    await criarServicoContas(acesso).alterar(id, {
      acao,
      ...(acao === "redefinir-senha" ? { senha: formulario.get("senha") } : {}),
    });
    revalidatePath("/admin");
    revalidatePath(`/admin/contas/${id}`);
    return { sucesso: acao === "redefinir-senha"
      ? "Senha redefinida e e-mail de primeiro acesso enviado. A troca é obrigatória no prazo informado."
      : "Estado da conta atualizado." };
  } catch (erro) { return { erro: erroSeguro(erro).message }; }
}
