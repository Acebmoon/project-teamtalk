import "server-only";

import { ErroAdmin } from "../admin/erros";
import { configurarEmail } from "./configuracao";
import { emailIndividual } from "./validacao";
import { templatePrimeiroAcesso } from "./template";

// Configuração e segredos só são lidos depois do guard, na operação de senha.
export function criarEmailCorporativo() {
  const configuracao = configurarEmail();
  return {
    validadeHoras: configuracao.validadeHoras,
    async enviar(dados: { nome: string; email: string; senha: string; expiraEm: string; entregaId: string }) {
      if (!emailIndividual(dados.email)) throw new ErroAdmin(400, "email-invalido", "Informe um e-mail individual válido.");
      try {
        const mensagem = templatePrimeiroAcesso({ ...dados, urlLogin: configuracao.urlLogin });
        const resposta = await fetch("https://api.resend.com/emails", {
          method: "POST", redirect: "error", cache: "no-store", signal: AbortSignal.timeout(10000),
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${configuracao.chave}`,
            "Idempotency-Key": `primeiro-acesso/${dados.entregaId}` },
          body: JSON.stringify({ from: `TeamTalk <${configuracao.remetente}>`, to: [dados.email], ...mensagem }),
        });
        // Nunca interpretar, registrar ou propagar o corpo/erro bruto do provedor.
        await resposta.body?.cancel();
        if (!resposta.ok) throw new Error();
      } catch {
        throw new ErroAdmin(502, "email-provedor", "O envio não foi confirmado. A conta permanece sem acesso; solicite uma nova credencial à TI.");
      }
    },
  };
}
