import { describe, expect, it } from "vitest";
import { formatarTamanhoArquivo, validarAnexoPdf } from "./validar-anexo-pdf";

const limite = 10 * 1024 * 1024;
const pdf = { name: "relatorio.pdf", type: "application/pdf", size: 1024 };

describe("validarAnexoPdf", () => {
  it("aceita PDF dentro do limite e exatamente no limite", () => {
    expect(validarAnexoPdf(pdf, limite)).toEqual({ valido: true });
    expect(validarAnexoPdf({ ...pdf, size: limite }, limite)).toEqual({ valido: true });
  });

  it("aceita extensão PDF em maiúsculas e MIME ausente em seletores mobile", () => {
    expect(validarAnexoPdf({ ...pdf, name: "RELATÓRIO.PDF" }, limite)).toEqual({ valido: true });
    expect(validarAnexoPdf({ ...pdf, type: "" }, limite)).toEqual({ valido: true });
  });

  it.each([
    ["foto.jpg", "image/jpeg"],
    ["foto.png", "image/png"],
    ["foto.heic", "image/heic"],
    ["audio.mp3", "audio/mpeg"],
    ["audio.m4a", "audio/mp4"],
    ["video.mp4", "video/mp4"],
    ["video.mov", "video/quicktime"],
    ["documento.doc", "application/msword"],
    ["documento.docx", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    ["planilha.xls", "application/vnd.ms-excel"],
    ["planilha.xlsx", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"],
  ])("rejeita %s e seu MIME mesmo se renomeado para PDF", (name, type) => {
    expect(validarAnexoPdf({ ...pdf, name, type }, limite)).toMatchObject({ valido: false, codigo: "formato" });
    expect(validarAnexoPdf({ ...pdf, name: "renomeado.pdf", type }, limite)).toMatchObject({ valido: false, codigo: "formato" });
  });

  it.each(["arquivo", "arquivo.pdf.exe", "imagem.png", "pdf"])("rejeita nome %s mesmo com MIME PDF", (name) => {
    expect(validarAnexoPdf({ ...pdf, name }, limite)).toMatchObject({ valido: false, codigo: "formato" });
    expect(validarAnexoPdf({ ...pdf, name, type: "" }, limite)).toMatchObject({ valido: false, codigo: "formato" });
  });

  it("rejeita PDF um byte acima do limite configurado com erro legível", () => {
    expect(validarAnexoPdf({ ...pdf, size: limite + 1 }, limite)).toMatchObject({
      valido: false,
      codigo: "tamanho",
      mensagem: expect.stringContaining("10 MB"),
    });
    expect(validarAnexoPdf(pdf, 1023)).toMatchObject({ valido: false, codigo: "tamanho" });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])("rejeita tamanho inválido %s", (size) => {
    expect(validarAnexoPdf({ ...pdf, size }, limite)).toMatchObject({ valido: false, codigo: "vazio" });
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])("bloqueia seleção com limite inválido %s", (maximo) => {
    expect(validarAnexoPdf(pdf, maximo)).toMatchObject({ valido: false, codigo: "limite" });
  });
});

describe("formatarTamanhoArquivo", () => {
  it.each([
    [0, "0 B"],
    [512, "512 B"],
    [1024, "1 KB"],
    [1536, "1,5 KB"],
    [limite, "10 MB"],
    [1024 ** 3, "1 GB"],
    [-1, "Tamanho indisponível"],
    [Number.NaN, "Tamanho indisponível"],
  ])("formata %s bytes como %s", (bytes, esperado) => {
    expect(formatarTamanhoArquivo(bytes)).toBe(esperado);
  });
});
