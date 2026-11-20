import { ErroInbox, LIMITE_CONVERSAS_INBOX, type PreferenciaConversa } from "./contratos";

export function objeto(valor: unknown): valor is Record<string, unknown> {
  return valor !== null && typeof valor === "object" && !Array.isArray(valor);
}
export function uuid(valor: unknown): valor is string {
  return typeof valor === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

function invalido(): never {
  throw new ErroInbox(400, "Preferências inválidas. Use de 1 a 50 conversas distintas e valores permitidos.");
}
function chavesExatas(valor: Record<string, unknown>, chaves: string[]) {
  return Object.keys(valor).length === chaves.length && chaves.every((chave) => Object.hasOwn(valor, chave));
}

export function validarConversaIds(valor: unknown): string[] {
  if (!Array.isArray(valor) || valor.length < 1 || valor.length > LIMITE_CONVERSAS_INBOX || !valor.every(uuid)) invalido();
  const ids = (valor as string[]).map((id) => id.toLowerCase());
  if (new Set(ids).size !== ids.length) invalido();
  return ids;
}

export function validarPreferencia(valor: unknown): valor is PreferenciaConversa {
  return objeto(valor) && chavesExatas(valor, ["conversaId", "prioridade", "situacao", "favorita"])
    && uuid(valor.conversaId)
    && ["normal", "alta", "urgente"].includes(valor.prioridade as string)
    && ["acompanhar", "em-conversa", "concluida"].includes(valor.situacao as string)
    && typeof valor.favorita === "boolean";
}

export function lerConsulta(parametros: URLSearchParams): string[] {
  if ([...parametros.keys()].some((chave) => chave !== "conversaId")) invalido();
  return validarConversaIds(parametros.getAll("conversaId"));
}

export function lerAtualizacao(corpo: unknown): PreferenciaConversa[] {
  if (!objeto(corpo) || !chavesExatas(corpo, ["preferencias"]) || !Array.isArray(corpo.preferencias)
    || !corpo.preferencias.every(validarPreferencia)) invalido();
  const preferencias = corpo.preferencias as PreferenciaConversa[];
  const ids = validarConversaIds(preferencias.map((pref) => pref.conversaId));
  return preferencias.map((pref, indice) => ({ ...pref, conversaId: ids[indice] }));
}

export function lerExclusao(corpo: unknown): string[] {
  if (!objeto(corpo) || !chavesExatas(corpo, ["conversaIds"])) invalido();
  return validarConversaIds(corpo.conversaIds);
}
