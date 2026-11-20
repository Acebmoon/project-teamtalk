import { forbidden, notFound, redirect } from "next/navigation";
import type { AcessoAdminTI } from "../../auth/exigir-admin-ti";
import { ErroAdmin, erroSeguro } from "../erros";
import { criarServicoLiberacao } from "./servico";
import { validarFiltrosAuditoria, validarFiltrosGrupos, validarFiltrosUsuarios, validarId, validarPaginacao } from "./validacoes";

export type ParametrosLiberacao = Promise<Record<string, string | string[] | undefined>>;

export async function carregarGrupos(acesso: AcessoAdminTI, parametros: ParametrosLiberacao) {
  const filtros = validarFiltrosGrupos(await parametros);
  const lista = await criarServicoLiberacao(acesso).listarGrupos(filtros);
  return { filtros, lista };
}
export async function carregarGrupo(acesso: AcessoAdminTI, parametros: Promise<{ id: string }>, busca: ParametrosLiberacao) {
  const id = validarId((await parametros).id);
  const dados = await busca;
  if (Object.keys(dados).some((chave) => !["pagina", "paginaUsuarios", "busca"].includes(chave)))
    throw new ErroAdmin(400, "validacao", "Filtros inválidos.");
  const filtrosMembros = validarPaginacao({ pagina: dados.pagina });
  const filtrosUsuarios = validarFiltrosUsuarios({ pagina: dados.paginaUsuarios, busca: dados.busca });
  const servico = criarServicoLiberacao(acesso);
  const grupo = await servico.consultarGrupo(id);
  const membros = await servico.listarMembros(id, filtrosMembros);
  const usuarios = await servico.listarUsuarios(filtrosUsuarios);
  return { grupo, membros, usuarios, busca: filtrosUsuarios.busca ?? "" };
}
export async function carregarAuditoria(acesso: AcessoAdminTI, parametros: ParametrosLiberacao) {
  const filtros = validarFiltrosAuditoria(await parametros);
  const lista = await criarServicoLiberacao(acesso).listarAuditoria(filtros);
  return { filtros, lista };
}
export function erroPaginaLiberacao(erro: unknown): string {
  const seguro = erroSeguro(erro);
  if (seguro.status === 401) redirect("/login");
  if (seguro.status === 403) forbidden();
  if (seguro.status === 404) notFound();
  return seguro.message;
}
