export type ErroNovaSenha = "curta" | "confirmacao" | null;

export function validarNovaSenha(senha: string, confirmacao: string): ErroNovaSenha {
  if (senha.length < 10) return "curta";
  if (senha !== confirmacao) return "confirmacao";
  return null;
}
