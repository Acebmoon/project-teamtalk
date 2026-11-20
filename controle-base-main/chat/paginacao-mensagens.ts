import { Buffer } from "node:buffer";
import { uuidValido } from "./validar-mensagens";

export type CursorMensagens = { criadaEm: string; id: string };
export type PaginacaoMensagens = { limite: number; cursor: CursorMensagens | null };

const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/;

function dataValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !timestamp.test(valor)) return false;
  const segundos = valor.slice(0, 19);
  const data = new Date(`${segundos}Z`);
  return Number.isFinite(data.getTime()) && data.toISOString().slice(0, 19) === segundos;
}

export function codificarCursorMensagens(cursor: CursorMensagens): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function lerPaginacaoMensagens(parametros: URLSearchParams): PaginacaoMensagens | null {
  for (const chave of parametros.keys()) {
    if ((chave !== "limite" && chave !== "cursor") || parametros.getAll(chave).length !== 1)
      return null;
  }
  const valorLimite = parametros.get("limite");
  const limite = valorLimite === null ? 20 : Number(valorLimite);
  if ((valorLimite !== null && !/^\d+$/.test(valorLimite)) ||
    !Number.isSafeInteger(limite) || limite < 1 || limite > 50) return null;
  const valorCursor = parametros.get("cursor");
  if (valorCursor === null) return { limite, cursor: null };
  if (valorCursor.length > 512 || !/^[A-Za-z0-9_-]+$/.test(valorCursor)) return null;
  try {
    const bytes = Buffer.from(valorCursor, "base64url");
    if (bytes.toString("base64url") !== valorCursor) return null;
    const cursor: unknown = JSON.parse(bytes.toString("utf8"));
    if (!cursor || typeof cursor !== "object" || !("id" in cursor) || !("criadaEm" in cursor) ||
      !uuidValido(cursor.id) || !dataValida(cursor.criadaEm)) return null;
    return { limite, cursor: { id: cursor.id, criadaEm: cursor.criadaEm } };
  } catch {
    return null;
  }
}
