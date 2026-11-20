import type { LeituraRegistrada, StatusLeiturasConversa } from "./contratos-leituras";
import { uuidLeituraValido, validarIdsLeituras } from "./validar-leituras";

export class FalhaClienteLeituras extends Error {
  constructor(public readonly status: number, mensagem: string) { super(mensagem); }
}

function caminho(conversaId: string) {
  if (!uuidLeituraValido(conversaId)) throw new Error("Conversa inválida.");
  return `/api/conversas/${conversaId.toLowerCase()}`;
}

async function lerResposta<T>(resposta: Response): Promise<T> {
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new FalhaClienteLeituras(resposta.status,
      typeof corpo?.erro === "string" ? corpo.erro : "Não foi possível processar as leituras.");
  }
  return resposta.json() as Promise<T>;
}

export async function listarLeituras(
  conversaId: string, mensagemIds: readonly string[], signal?: AbortSignal,
): Promise<StatusLeiturasConversa> {
  const parametros = new URLSearchParams();
  validarIdsLeituras(mensagemIds).forEach((id) => parametros.append("mensagemId", id));
  const resposta = await fetch(`${caminho(conversaId)}/leituras?${parametros}`, {
    credentials: "same-origin", cache: "no-store", signal,
  });
  return lerResposta<StatusLeiturasConversa>(resposta);
}

// Invocar somente após exibição efetiva, por observarMensagemExibida().
// Nem o usuário nem o horário do recibo são aceitos do navegador.
export async function marcarMensagemExibida(
  conversaId: string, mensagemId: string, signal?: AbortSignal,
): Promise<LeituraRegistrada> {
  if (!uuidLeituraValido(mensagemId)) throw new Error("Mensagem inválida.");
  const resposta = await fetch(`${caminho(conversaId)}/mensagens/${mensagemId.toLowerCase()}/leituras`, {
    method: "POST", credentials: "same-origin", cache: "no-store", signal,
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ exibida: true }),
  });
  return lerResposta<LeituraRegistrada>(resposta);
}
