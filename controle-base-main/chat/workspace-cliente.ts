import type { PaginaConversas } from "./contratos";
import type { PdfEnviado } from "../anexos/contratos";

export class FalhaWorkspace extends Error {
  constructor(public readonly status: number, mensagem: string) { super(mensagem); }
}

async function resposta<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const corpo = await res.json().catch(() => null);
    throw new FalhaWorkspace(res.status, typeof corpo?.erro === "string" ? corpo.erro : "Não foi possível concluir a operação.");
  }
  return res.json() as Promise<T>;
}

export async function listarConversas(cursor?: string, signal?: AbortSignal): Promise<PaginaConversas> {
  const parametros = new URLSearchParams({ limite: "50" });
  if (cursor) parametros.set("cursor", cursor);
  return resposta(await fetch(`/api/conversas?${parametros}`, {
    credentials: "same-origin", cache: "no-store", signal,
  }));
}

export async function enviarPdf(conversaId: string, arquivo: File): Promise<PdfEnviado> {
  const formulario = new FormData();
  // Seletores iOS podem omitir o MIME; a extensão e os bytes serão validados no servidor.
  formulario.set("arquivo", arquivo.type ? arquivo : new File([arquivo], arquivo.name, { type: "application/pdf" }));
  return resposta(await fetch(`/api/conversas/${encodeURIComponent(conversaId)}/anexos/pdf`, {
    method: "POST", credentials: "same-origin", cache: "no-store", body: formulario,
  }));
}

export function statusFalha(erro: unknown): number | undefined {
  return erro && typeof erro === "object" && "status" in erro && typeof erro.status === "number" ? erro.status : undefined;
}
