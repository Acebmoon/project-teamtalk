type PrimeiroAcesso = {
  nome: string;
  email: string;
  senha: string;
  expiraEm: string;
  urlLogin: string;
};

function escapar(valor: string) {
  return valor.replace(/[&<>"']/g, (caractere) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[caractere]!);
}

export function templatePrimeiroAcesso(dados: PrimeiroAcesso) {
  const instrucoes = "Acesse pelo celular, entre com a senha provisória e substitua-a antes de usar o TeamTalk. "
    + "A credencial deixa de valer após a troca. Se o prazo vencer, solicite uma nova senha à TI. "
    + "A liberação da conta e do grupo também depende da TI. Não encaminhe este e-mail.";
  const prazo = new Date(dados.expiraEm).toISOString();
  return {
    subject: "TeamTalk — seu primeiro acesso",
    text: `Olá, ${dados.nome}.\n\nUsuário: ${dados.email}\nSenha provisória: ${dados.senha}\nVálida até: ${prazo} (UTC)\nAcesso: ${dados.urlLogin}\n\n${instrucoes}`,
    html: `<p>Olá, ${escapar(dados.nome)}.</p><p>Usuário: ${escapar(dados.email)}</p>`
      + `<p>Senha provisória: <code style="white-space:pre-wrap">${escapar(dados.senha)}</code></p><p>Válida até: ${prazo} (UTC)</p>`
      + `<p><a href="${escapar(dados.urlLogin)}">Abrir TeamTalk</a></p><p>${instrucoes}</p>`,
  };
}
