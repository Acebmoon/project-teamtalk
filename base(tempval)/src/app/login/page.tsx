import { entrar } from "@controle/auth/entrar";
import { mensagemDeErro, mensagemDeAviso } from "@controle/auth/login";
import { TelaLogin } from "@design/telas/login";

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; aviso?: string }>;
}) {
  const { erro, aviso } = await searchParams;
  return <TelaLogin entrar={entrar} mensagem={mensagemDeErro(erro)} aviso={mensagemDeAviso(aviso)} />;
}
