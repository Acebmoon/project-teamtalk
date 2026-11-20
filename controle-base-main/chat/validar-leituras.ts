export const LIMITE_MENSAGENS_LEITURAS = 50;

export class FalhaLeituras extends Error {
  constructor(public readonly status: number, mensagem: string) { super(mensagem); }
}

export function uuidLeituraValido(valor: unknown): valor is string {
  return typeof valor === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);
}

export function validarIdsLeituras(ids: readonly string[]): string[] {
  if (!ids.length || ids.length > LIMITE_MENSAGENS_LEITURAS || ids.some((id) => !uuidLeituraValido(id)))
    throw new FalhaLeituras(400, "Informe de 1 a 50 IDs de mensagens válidos.");
  const normalizados = ids.map((id) => id.toLowerCase());
  if (new Set(normalizados).size !== ids.length)
    throw new FalhaLeituras(400, "Não repita IDs de mensagens.");
  return normalizados;
}

export function validarExibicao(entrada: unknown) {
  if (!entrada || typeof entrada !== "object" || Array.isArray(entrada)
    || Object.keys(entrada).length !== 1 || !("exibida" in entrada) || entrada.exibida !== true)
    throw new FalhaLeituras(400, "Confirme somente a exibição da mensagem com exibida: true.");
}
