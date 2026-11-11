export function mensagemDeErro(erro?: string) {
  return erro === "acesso"
    ? "Acesso não liberado. Fale com a TI."
    : erro === "sessao"
      ? "Sessão encerrada. Entre novamente."
      : erro === "credenciais"
        ? "Usuário ou senha inválidos."
        : "";
}

export function mensagemDeAviso(aviso?: string) {
  return aviso === "senha-alterada" ? "Senha alterada. Entre com a nova senha." : "";
}
