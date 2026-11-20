import type { PaginaMensagens, TextoEnviado } from "./contratos-mensagens";
import { uuidValido } from "./validar-mensagens";

export class FalhaClienteMensagens extends Error {
  constructor(public readonly status: number, mensagem: string) { super(mensagem); }
}

function caminho(conversaId: string) {
  if (!uuidValido(conversaId)) throw new Error("Conversa inválida.");
  return `/api/conversas/${conversaId}/mensagens`;
}

async function lerResposta<T>(resposta: Response): Promise<T> {
  if (!resposta.ok) {
    const corpo = await resposta.json().catch(() => null);
    throw new FalhaClienteMensagens(resposta.status,
      typeof corpo?.erro === "string" ? corpo.erro : "Não foi possível processar as mensagens.");
  }
  return resposta.json() as Promise<T>;
}

export async function listarMensagens(
  conversaId: string,
  opcoes: { limite?: number; cursor?: string; signal?: AbortSignal } = {},
): Promise<PaginaMensagens> {
  const parametros = new URLSearchParams();
  if (opcoes.limite !== undefined) parametros.set("limite", String(opcoes.limite));
  if (opcoes.cursor !== undefined) parametros.set("cursor", opcoes.cursor);
  const resposta = await fetch(`${caminho(conversaId)}?${parametros}`, {
    credentials: "same-origin", cache: "no-store", signal: opcoes.signal,
  });
  return lerResposta<PaginaMensagens>(resposta);
}

export async function enviarMensagemTexto(conversaId: string, conteudo: string): Promise<TextoEnviado> {
  const resposta = await fetch(caminho(conversaId), {
    method: "POST", credentials: "same-origin", cache: "no-store",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify({ conteudo }),
  });
  return lerResposta<TextoEnviado>(resposta);
}
