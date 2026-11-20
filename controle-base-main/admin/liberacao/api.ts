import { exigirAdminTI } from "../../auth/exigir-admin-ti";
import { lerJsonAdmin, respostaAdmin, respostaErroAdmin } from "../http";
import { criarServicoLiberacao } from "./servico";
import { filtrosURL } from "./validacoes";

type ContextoGrupo = { params: Promise<{ id: string }> };

export async function GETGrupos(request: Request) {
  try {
    const acesso = await exigirAdminTI();
    return respostaAdmin(await criarServicoLiberacao(acesso).listarGrupos(filtrosURL(request.url)));
  } catch (erro) { return respostaErroAdmin(erro); }
}
export async function POSTGrupos(request: Request) {
  try {
    const acesso = await exigirAdminTI();
    const dados = await lerJsonAdmin(request);
    return respostaAdmin(await criarServicoLiberacao(acesso).criarGrupo(dados), 201);
  } catch (erro) { return respostaErroAdmin(erro); }
}
export async function GETGrupo(_request: Request, contexto: ContextoGrupo) {
  try {
    const acesso = await exigirAdminTI();
    const { id } = await contexto.params;
    return respostaAdmin(await criarServicoLiberacao(acesso).consultarGrupo(id));
  } catch (erro) { return respostaErroAdmin(erro); }
}
export async function PATCHGrupo(request: Request, contexto: ContextoGrupo) {
  try {
    const acesso = await exigirAdminTI();
    const { id } = await contexto.params;
    const dados = await lerJsonAdmin(request);
    return respostaAdmin(await criarServicoLiberacao(acesso).alterarGrupo(id, dados));
  } catch (erro) { return respostaErroAdmin(erro); }
}
export async function GETMembros(request: Request, contexto: ContextoGrupo) {
  try {
    const acesso = await exigirAdminTI();
    const { id } = await contexto.params;
    return respostaAdmin(await criarServicoLiberacao(acesso).listarMembros(id, filtrosURL(request.url)));
  } catch (erro) { return respostaErroAdmin(erro); }
}
export async function GETUsuarios(request: Request) {
  try {
    const acesso = await exigirAdminTI();
    return respostaAdmin(await criarServicoLiberacao(acesso).listarUsuarios(filtrosURL(request.url)));
  } catch (erro) { return respostaErroAdmin(erro); }
}
export async function GETAuditoria(request: Request) {
  try {
    const acesso = await exigirAdminTI();
    return respostaAdmin(await criarServicoLiberacao(acesso).listarAuditoria(filtrosURL(request.url)));
  } catch (erro) { return respostaErroAdmin(erro); }
}
