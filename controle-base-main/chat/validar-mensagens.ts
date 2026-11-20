export const TAMANHO_MAXIMO_TEXTO = 4000;
export const uuidValido = (valor: unknown): valor is string =>
  typeof valor === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(valor);

export class FalhaMensagens extends Error {
  constructor(public readonly status: 400 | 403, mensagem: string) {
    super(mensagem);
  }
}

export function validarTexto(valor: unknown): string {
  if (typeof valor !== "string" || !valor.trim() ||
    valor.length > TAMANHO_MAXIMO_TEXTO || valor.includes("\0"))
    throw new FalhaMensagens(400, "Informe um texto de 1 a 4000 caracteres.");
  return valor.trim();
}

export function lerEnvioTexto(valor: unknown): string {
  if (!valor || typeof valor !== "object" || Array.isArray(valor) ||
    Object.keys(valor).length !== 1 || !("conteudo" in valor))
    throw new FalhaMensagens(400, "Envie somente o campo conteudo.");
  return validarTexto(valor.conteudo);
}
