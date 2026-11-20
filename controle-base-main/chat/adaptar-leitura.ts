import type { MensagemParaLeitura, StatusLeituraMensagem } from "./contratos-leituras";

type EstadoMensagem = "enviando" | "enviada" | "lida" | "falha";

export function estadoLeituraDestinatario(status: StatusLeituraMensagem, destinatarioId: string) {
  return status.destinatarios.some((item) => item.usuarioId === destinatarioId && item.lidaEm !== null)
    ? "lida" as const : "enviada" as const;
}

// Compatível estruturalmente com MensagemConversa (#94). Em grupos o balão
// agregado só fica lido quando todos os destinatários leram.
// A consulta por destinatário continua disponível separadamente para os detalhes.
export function adaptarEstadoLeitura<T extends MensagemParaLeitura & { estado: EstadoMensagem }>(
  mensagem: T, status: StatusLeituraMensagem | undefined, destinatarioId?: string,
): T {
  if (!status || status.mensagemId !== mensagem.id || status.remetenteId !== mensagem.remetenteId
    || mensagem.estado === "enviando" || mensagem.estado === "falha") return mensagem;
  const lida = destinatarioId
    ? estadoLeituraDestinatario(status, destinatarioId) === "lida"
    : status.destinatarios.length > 0 && status.destinatarios.every((item) => item.lidaEm !== null);
  return { ...mensagem, estado: lida ? "lida" : "enviada" };
}
