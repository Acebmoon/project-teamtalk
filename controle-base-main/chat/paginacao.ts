import { Buffer } from "node:buffer";

export const LIMITE_PADRAO = 20;
export const LIMITE_MAXIMO = 50;

export type CursorConversas = { atividadeEm: string; id: string };
export type ParametrosListagem = {
  limite: number;
  cursor: CursorConversas | null;
};

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const timestamp = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-](?:0\d|1[0-4]):[0-5]\d)$/;

function atividadeValida(valor: unknown): valor is string {
  if (typeof valor !== "string" || !timestamp.test(valor)) return false;
  // Valida o calendário sem descartar os microssegundos usados no cursor SQL.
  const segundos = valor.slice(0, 19);
  const data = new Date(`${segundos}Z`);
  return Number.isFinite(data.getTime()) &&
    data.toISOString().slice(0, 19) === segundos;
}

export function codificarCursor(cursor: CursorConversas): string {
  return Buffer.from(JSON.stringify(cursor), "utf8").toString("base64url");
}

export function lerPaginacao(parametros: URLSearchParams): ParametrosListagem | null {
  for (const chave of parametros.keys()) {
    if ((chave !== "limite" && chave !== "cursor") || parametros.getAll(chave).length !== 1)
      return null;
  }

  const valorLimite = parametros.get("limite");
  const limite = valorLimite === null ? LIMITE_PADRAO : Number(valorLimite);
  if ((valorLimite !== null && !/^\d+$/.test(valorLimite)) ||
    !Number.isSafeInteger(limite) || limite < 1 || limite > LIMITE_MAXIMO)
    return null;

  const valorCursor = parametros.get("cursor");
  if (valorCursor === null) return { limite, cursor: null };
  if (valorCursor.length > 512 || !/^[A-Za-z0-9_-]+$/.test(valorCursor)) return null;

  try {
    const conteudo = Buffer.from(valorCursor, "base64url");
    if (conteudo.toString("base64url") !== valorCursor) return null;
    const cursor = JSON.parse(conteudo.toString("utf8")) as CursorConversas | null;
    if (!cursor || typeof cursor.id !== "string" || !uuid.test(cursor.id) ||
      !atividadeValida(cursor.atividadeEm)) return null;
    return { limite, cursor: { id: cursor.id, atividadeEm: cursor.atividadeEm } };
  } catch {
    return null;
  }
}
