export type ErroNovaSenha = "curta" | "longa" | "confirmacao" | null;

export function validarNovaSenha(senha: string, confirmacao: string): ErroNovaSenha {
  if ([...senha].length < 10) return "curta";
  if (new TextEncoder().encode(senha).length > 72) return "longa";
  if (senha !== confirmacao) return "confirmacao";
  return null;
}
