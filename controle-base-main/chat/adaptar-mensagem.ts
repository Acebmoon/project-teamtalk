import type { MensagemChat } from "./contratos-mensagens";

// Compatível com MensagemConversa do PR #94. Recibos reais serão tratados na #80.
export function adaptarMensagemConversa(mensagem: MensagemChat, remetenteNome = "Participante") {
  return {
    id: mensagem.id, conversaId: mensagem.conversaId, remetenteId: mensagem.remetenteId,
    remetenteNome, criadaEm: mensagem.criadaEm,
    conteudo: mensagem.tipo === "text" ? mensagem.conteudo : `PDF: ${mensagem.nomeArquivo}`,
    estado: "enviada" as const,
  };
}
