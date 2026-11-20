import { NextResponse } from "next/server";
import { ErroAdmin, erroSeguro } from "./erros";

export function respostaAdmin(dados: unknown, status = 200) {
  return NextResponse.json(dados, { status, headers: { "Cache-Control": "no-store" } });
}

export function respostaErroAdmin(erro: unknown) {
  const seguro = erroSeguro(erro);
  return respostaAdmin({ erro: seguro.message, codigo: seguro.codigo }, seguro.status);
}

export async function lerJsonAdmin(request: Request): Promise<unknown> {
  const origem = request.headers.get("origin");
  if ((origem && origem !== new URL(request.url).origin) || request.headers.get("sec-fetch-site") === "cross-site")
    throw new ErroAdmin(403, "origem", "Origem não permitida.");
  if (request.headers.get("content-type")?.split(";")[0].trim() !== "application/json")
    throw new ErroAdmin(415, "conteudo", "Envie os dados como JSON.");
  // O corpo só é lido depois do RBAC e nunca é incluído em erros ou logs.
  if (Number(request.headers.get("content-length")) > 16384)
    throw new ErroAdmin(413, "tamanho", "Dados acima do limite.");
  const corpo = await request.text();
  if (new TextEncoder().encode(corpo).length > 16384)
    throw new ErroAdmin(413, "tamanho", "Dados acima do limite.");
  try { return JSON.parse(corpo); }
  catch { throw new ErroAdmin(400, "json", "JSON inválido."); }
}
