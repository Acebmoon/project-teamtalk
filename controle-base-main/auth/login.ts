import { TelaLogin } from "@design/telas/login";
import { entrar } from "./entrar";

export async function mostrarLogin({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string }>;
}) {
  const { erro } = await searchParams;
  const mensagem = erro === "acesso"
    ? "Acesso não liberado. Fale com a TI."
    : erro === "sessao"
      ? "Sessão encerrada. Entre novamente."
      : erro === "credenciais"
        ? "Usuário ou senha inválidos."
        : "";

  return TelaLogin({ entrar, mensagem });
}
