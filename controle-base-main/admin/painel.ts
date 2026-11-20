import { redirect } from "next/navigation";
import { notFound } from "next/navigation";
import { exigirAdminTI } from "../auth/exigir-admin-ti";
import { carregarNomeAdmin } from "./nome";
import { criarServicoContas } from "./servico";
import { erroSeguro } from "./erros";
import { validarFiltros } from "./validacoes";

export type ParametrosPainel = Promise<Record<string, string | string[] | undefined>>;

export async function carregarPainelAdmin(parametros: ParametrosPainel) {
  const acesso = await exigirAdminTI();
  const filtros = validarFiltros(await parametros);
  const nome = await carregarNomeAdmin(acesso.supabase, acesso.usuario.id, acesso.usuario.email);
  const lista = await criarServicoContas(acesso).listar(filtros);
  return { nome, filtros, lista };
}

export async function carregarContaAdmin(parametros: Promise<{ id: string }>) {
  const acesso = await exigirAdminTI();
  const { id } = await parametros;
  const conta = await criarServicoContas(acesso).consultar(id);
  return { conta, propriaConta: conta.id === acesso.usuario.id };
}

export function mensagemErroPagina(erro: unknown): string {
  const seguro = erroSeguro(erro);
  if (seguro.status === 401) redirect("/login");
  if (seguro.status === 403) redirect("/");
  if (seguro.status === 404) notFound();
  return seguro.message;
}
