import { carregarPrimeiroAcesso, mensagemDeErroTroca } from "@controle/auth/primeiro-acesso";
import { trocarSenha } from "@controle/auth/trocar-senha";
import { sair } from "@controle/auth/sair";
import { TelaPrimeiroAcesso } from "@design/telas/primeiro-acesso";

export default async function PaginaPrimeiroAcesso({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const { email } = await carregarPrimeiroAcesso();
  return <TelaPrimeiroAcesso
    email={email} trocarSenha={trocarSenha} sair={sair}
    mensagem={mensagemDeErroTroca(erro)}
  />;
}
