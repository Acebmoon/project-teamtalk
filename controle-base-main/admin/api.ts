import { exigirAdminTI } from "../auth/exigir-admin-ti";
import { criarServicoContas } from "./servico";
import { lerJsonAdmin, respostaAdmin, respostaErroAdmin } from "./http";

export async function listarContas(request: Request) {
  try {
    const acesso = await exigirAdminTI();
    const filtros = Object.fromEntries(new URL(request.url).searchParams);
    return respostaAdmin(await criarServicoContas(acesso).listar(filtros));
  } catch (erro) { return respostaErroAdmin(erro); }
}

export async function cadastrarConta(request: Request) {
  try {
    const acesso = await exigirAdminTI();
    const dados = await lerJsonAdmin(request);
    return respostaAdmin({ conta: await criarServicoContas(acesso).cadastrar(dados) }, 201);
  } catch (erro) { return respostaErroAdmin(erro); }
}

type Contexto = { params: Promise<{ id: string }> };

export async function consultarConta(_request: Request, contexto: Contexto) {
  try {
    const acesso = await exigirAdminTI();
    const { id } = await contexto.params;
    return respostaAdmin({ conta: await criarServicoContas(acesso).consultar(id) });
  } catch (erro) { return respostaErroAdmin(erro); }
}

export async function alterarConta(request: Request, contexto: Contexto) {
  try {
    const acesso = await exigirAdminTI();
    const { id } = await contexto.params;
    const dados = await lerJsonAdmin(request);
    return respostaAdmin({ conta: await criarServicoContas(acesso).alterar(id, dados) });
  } catch (erro) { return respostaErroAdmin(erro); }
}
