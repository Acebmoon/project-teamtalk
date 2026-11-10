import { entrar } from "@controle/auth/entrar";
import { mensagemDeErro } from "@controle/auth/login";
import { TelaLogin } from "@design/telas/login";

export default async function PaginaLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  return <TelaLogin entrar={entrar} mensagem={mensagemDeErro(erro)} />;
}
