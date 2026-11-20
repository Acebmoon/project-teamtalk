import type { ConversaListada } from "./contratos";

// Estruturalmente compatível com ConversaResumo do PR #94.
// Pode ser usado no cliente para formatar o horário no fuso do aparelho.
export function adaptarConversaResumo(conversa: ConversaListada) {
  const mensagem = conversa.ultimaMensagem;
  return {
    id: conversa.id,
    titulo: conversa.titulo,
    subtitulo: `${conversa.participantes.length} ${conversa.participantes.length === 1 ? "participante" : "participantes"}`,
    avatarTexto: conversa.titulo.split(/\s+/).slice(0, 2).map((parte) => parte[0]).join("").toLocaleUpperCase("pt-BR"),
    ultimaMensagem: mensagem?.tipo === "pdf" ? mensagem.nomeArquivo ?? "PDF" : mensagem?.conteudo ?? undefined,
    horarioUltimaMensagem: mensagem
      ? new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(new Date(mensagem.criadaEm))
      : undefined,
    naoLidas: conversa.naoLidas,
  };
}
