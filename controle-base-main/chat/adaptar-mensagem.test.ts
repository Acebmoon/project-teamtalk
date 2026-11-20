import { describe, expect, it } from "vitest";
import { adaptarMensagemConversa } from "./adaptar-mensagem";
import type { MensagemChat } from "./contratos-mensagens";
import { reconciliarMensagens } from "./reconciliar-mensagens";

const mensagem: MensagemChat = {
  id: "b", conversaId: "conversa", remetenteId: "remetente", tipo: "text", conteudo: "Olá",
  nomeArquivo: null, criadaEm: "2026-11-19T12:30:15.123456+00:00", editadaEm: null,
};

describe("adaptação para PR #94 e reconciliação por ID", () => {
  it("só confirma estado enviada após persistência, sem inventar leitura ou identidade", () => {
    expect(adaptarMensagemConversa(mensagem)).toEqual({
      id: "b", conversaId: "conversa", remetenteId: "remetente", remetenteNome: "Participante",
      conteudo: "Olá", criadaEm: mensagem.criadaEm, estado: "enviada",
    });
    expect(adaptarMensagemConversa(mensagem, "Nome autorizado").remetenteNome).toBe("Nome autorizado");
  });
  it("oferece preview de PDF sem URL ou caminho de armazenamento", () => {
    expect(adaptarMensagemConversa({ ...mensagem, tipo: "pdf", conteudo: null, nomeArquivo: "Ata.pdf" }).conteudo)
      .toBe("PDF: Ata.pdf");
  });
  it("reconcilia confirmação, evento e histórico sem duplicar mensagens", () => {
    const nova = { ...mensagem, conteudo: "Conteúdo confirmado" };
    expect(reconciliarMensagens([mensagem], [nova])).toEqual([nova]);
    expect(mensagem.conteudo).toBe("Olá");
  });
  it("ordena microssegundos, fusos e empates por ID sem alterar o array anterior", () => {
    const anterior = [mensagem];
    const resultado = reconciliarMensagens(anterior, [
      { ...mensagem, id: "z", criadaEm: "2026-11-19T09:30:15.123455-03:00" },
      { ...mensagem, id: "a" },
    ]);
    expect(resultado.map((item) => item.id)).toEqual(["z", "a", "b"]);
    expect(anterior).toEqual([mensagem]);
  });
});
