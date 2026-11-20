import { afterEach, describe, expect, it, vi } from "vitest";
import { PDFDocument, PDFName } from "pdf-lib";
import { criarPdfTeste } from "./fixtures";
import { LIMITE_PDF_PADRAO, obterLimitePdf, validarPdf } from "./validar-pdf";

afterEach(() => vi.unstubAllEnvs());

const arquivo = (bytes: Uint8Array, nome = "relatório.pdf", mime = "application/pdf") =>
  new File([Uint8Array.from(bytes)], nome, { type: mime });

describe("validação real de PDF", () => {
  it.each([true, false])("aceita PDF com páginas e xref comprimido=%s", async (comprimido) => {
    const bytes = await criarPdfTeste(comprimido);
    const pdf = await validarPdf(arquivo(bytes), bytes.length);
    expect(pdf.bytes).toEqual(bytes);
    expect(pdf.nome).toBe("relatório.pdf");
  });

  it("aplica 10 MiB por padrão e permite configuração pelo ambiente", () => {
    vi.stubEnv("PDF_MAX_BYTES", undefined);
    expect(obterLimitePdf()).toBe(10 * 1024 * 1024);
    vi.stubEnv("PDF_MAX_BYTES", "2048");
    expect(obterLimitePdf()).toBe(2048);
  });

  it.each(["0", "-1", "abc", "1.5", "Infinity", "9007199254740991"])("falha fechada para configuração %s", (limite) => {
    expect(() => obterLimitePdf(limite)).toThrow("Limite de PDF não configurado corretamente.");
  });

  it("rejeita acima do limite antes de ler ou analisar o conteúdo", async () => {
    const arrayBuffer = vi.fn();
    await expect(validarPdf({ name: "grande.pdf", type: "application/pdf", size: LIMITE_PDF_PADRAO + 1, arrayBuffer }))
      .rejects.toMatchObject({ status: 413, codigo: "PDF_MUITO_GRANDE" });
    expect(arrayBuffer).not.toHaveBeenCalled();
  });

  it("verifica também o tamanho real dos bytes", async () => {
    const bytes = await criarPdfTeste();
    await expect(validarPdf({ name: "falso.pdf", type: "application/pdf", size: 10,
      arrayBuffer: async () => Uint8Array.from(bytes).buffer }, 100))
      .rejects.toMatchObject({ status: 413 });
  });

  it("rejeita PDF com MIME diferente mesmo com conteúdo válido", async () => {
    await expect(validarPdf(arquivo(await criarPdfTeste(), "certo.pdf", "application/octet-stream")))
      .rejects.toMatchObject({ status: 415, codigo: "MIME_INVALIDO" });
  });

  it.each([
    ["PNG", "\x89PNG\r\n\x1a\n"], ["JPEG", "\xff\xd8\xff\xe0JFIF"],
    ["áudio", "ID3\x04\x00\x00"], ["WAV", "RIFF0000WAVE"],
    ["vídeo", "\x00\x00\x00\x18ftypmp42"], ["Word/Excel OLE", "\xd0\xcf\x11\xe0\xa1\xb1\x1a\xe1"],
    ["Word/Excel ZIP", "PK\x03\x04word/document.xml"], ["Excel CSV", "nome;valor\nabc;123"],
    ["vazio", ""], ["cabeçalho apenas", "%PDF-1.7\n"],
    ["prefixo e tokens falsos", "%PDF-1.7\n/Type /Catalog /Pages /Page\nstartxref\n9\n%%EOF"],
  ])("rejeita %s renomeado como PDF com MIME forjado", async (_tipo, bytes) => {
    await expect(validarPdf(arquivo(Buffer.from(bytes, "latin1"), "forjado.pdf")))
      .rejects.toMatchObject({ status: 415, codigo: "PDF_INVALIDO" });
  });

  it("rejeita PDF truncado, lixo após EOF e offset de xref forjado", async () => {
    const bytes = await criarPdfTeste(false);
    const offsetFalso = Buffer.from(bytes.toString("latin1").replace(/startxref\s+\d+/, "startxref\n9"), "latin1");
    for (const invalido of [bytes.subarray(0, -20), Buffer.concat([bytes, Buffer.from("PK\x03\x04")]), offsetFalso]) {
      await expect(validarPdf(arquivo(invalido))).rejects.toMatchObject({ codigo: "PDF_INVALIDO" });
    }
  });

  it("rejeita catálogo sem páginas e PDF criptografado não verificável", async () => {
    const vazio = await PDFDocument.create();
    const bytes = await vazio.save({ addDefaultPage: false, useObjectStreams: false });
    await expect(validarPdf(arquivo(bytes))).rejects.toMatchObject({ codigo: "PDF_INVALIDO" });
    vazio.addPage();
    vazio.context.trailerInfo.Encrypt = vazio.context.register(vazio.context.obj({ Filter: PDFName.of("Standard") }));
    await expect(validarPdf(arquivo(await vazio.save({ useObjectStreams: false }))))
      .rejects.toMatchObject({ codigo: "PDF_INVALIDO" });
  });

  it.each(["relatorio.docx", "a/relatorio.pdf", "a\\relatorio.pdf", "a\r\n.pdf", ".pdf", "a".repeat(180) + ".pdf"])(
    "rejeita nome inseguro %s", async (nome) => {
      await expect(validarPdf(arquivo(await criarPdfTeste(), nome))).rejects.toMatchObject({ status: 400 });
    },
  );
});
