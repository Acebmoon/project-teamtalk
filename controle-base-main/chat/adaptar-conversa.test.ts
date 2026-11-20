import { describe, expect, it } from "vitest";
import { adaptarConversaResumo } from "./adaptar-conversa";
import type { ConversaListada } from "./contratos";

const conversa: ConversaListada = {
  id: "conversa",
  tipo: "group",
  titulo: "Equipe Produto",
  criadaEm: "2026-11-19T12:00:00Z",
  atualizadaEm: "2026-11-19T12:00:00Z",
  atividadeEm: "2026-11-19T12:00:00Z",
  participantes: [{ usuarioId: "usuario", entrouEm: "2026-11-19T12:00:00Z" }],
  ultimaMensagem: null,
  naoLidas: 0,
};

describe("adaptarConversaResumo para PR #94", () => {
  it("produz os campos visuais de uma conversa vazia", () => {
    expect(adaptarConversaResumo(conversa)).toEqual({
      id: "conversa", titulo: "Equipe Produto", avatarTexto: "EP",
      subtitulo: "1 participante", naoLidas: 0,
      ultimaMensagem: undefined, horarioUltimaMensagem: undefined,
    });
  });

  it.each([
    { tipo: "text" as const, conteudo: "Olá", nomeArquivo: null, preview: "Olá" },
    { tipo: "pdf" as const, conteudo: null, nomeArquivo: "Ata.pdf", preview: "Ata.pdf" },
  ])("adapta a última mensagem $tipo e formata o horário", (mensagem) => {
    const resumo = adaptarConversaResumo({ ...conversa, ultimaMensagem: {
      id: "mensagem", remetenteId: "outro", criadaEm: "2026-11-19T12:30:00Z",
      tipo: mensagem.tipo, conteudo: mensagem.conteudo, nomeArquivo: mensagem.nomeArquivo,
    }, naoLidas: 2 });
    expect(resumo.ultimaMensagem).toBe(mensagem.preview);
    expect(resumo.horarioUltimaMensagem).toBe(new Intl.DateTimeFormat("pt-BR", {
      hour: "2-digit", minute: "2-digit",
    }).format(new Date("2026-11-19T12:30:00Z")));
    expect(resumo.naoLidas).toBe(2);
    expect(resumo).not.toHaveProperty("online");
  });
});
