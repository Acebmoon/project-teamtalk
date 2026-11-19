export class ErroAdmin extends Error {
  constructor(public status: number, public codigo: string, mensagem: string) {
    super(mensagem);
    this.name = "ErroAdmin";
  }
}

export function erroSeguro(erro: unknown): ErroAdmin {
  return erro instanceof ErroAdmin ? erro
    : new ErroAdmin(503, "indisponivel", "Não foi possível concluir. Consulte a conta antes de tentar novamente.");
}
