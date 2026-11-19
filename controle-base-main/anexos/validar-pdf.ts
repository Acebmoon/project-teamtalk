import { PDFDocument, PDFName, PDFObjectParser, PDFRawStream, PDFRef } from "pdf-lib";
import type { ArquivoPdf } from "./contratos";
import { ErroPdf } from "./erro";

export const LIMITE_PDF_PADRAO = 10 * 1024 * 1024;
export const MARGEM_MULTIPART = 64 * 1024;

export function obterLimitePdf(valor = process.env.PDF_MAX_BYTES): number {
  if (valor === undefined || valor === "") return LIMITE_PDF_PADRAO;
  const limite = Number(valor);
  if (!/^\d+$/.test(valor) || !Number.isSafeInteger(limite + MARGEM_MULTIPART) || limite <= 0) {
    throw new ErroPdf(500, "CONFIGURACAO_INVALIDA", "Limite de PDF não configurado corretamente.");
  }
  return limite;
}

export function validarNomePdf(nome: string): string {
  const normalizado = nome.normalize("NFC").trim();
  const temControle = Array.from(normalizado).some((c) => {
    const codigo = c.codePointAt(0)!;
    return codigo < 32 || codigo === 127 || (codigo >= 0x202a && codigo <= 0x202e) ||
      (codigo >= 0x2066 && codigo <= 0x2069);
  });
  if (!/\.pdf$/i.test(normalizado) || /[/\\]/.test(normalizado) || temControle ||
    Buffer.byteLength(normalizado, "utf8") > 180 || normalizado.length <= 4) {
    throw new ErroPdf(400, "NOME_INVALIDO", "Informe um nome de arquivo PDF válido (até 180 bytes).");
  }
  return normalizado;
}

function pdfInvalido(): never {
  throw new ErroPdf(415, "PDF_INVALIDO", "O conteúdo do arquivo não é um PDF válido e legível.");
}

export async function validarPdf(arquivo: ArquivoPdf, limite = obterLimitePdf()) {
  if (arquivo.size > limite) {
    throw new ErroPdf(413, "PDF_MUITO_GRANDE", `O PDF deve ter no máximo ${limite} bytes.`);
  }
  if (arquivo.type !== "application/pdf") {
    throw new ErroPdf(415, "MIME_INVALIDO", "Somente arquivos application/pdf são permitidos.");
  }
  const nome = validarNomePdf(arquivo.name);
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  // Confira os bytes reais também, sem confiar no tamanho declarado pelo chamador.
  if (bytes.length > limite) {
    throw new ErroPdf(413, "PDF_MUITO_GRANDE", `O PDF deve ter no máximo ${limite} bytes.`);
  }
  if (bytes.length !== arquivo.size || !/^%PDF-(?:1\.[0-7]|2\.0)(?:\r\n|\r|\n)/.test(bytes.subarray(0, 16).toString("latin1"))) {
    pdfInvalido();
  }
  // O parser pode recuperar PDFs truncados; exija também o encerramento e um xref real.
  const final = /startxref\s+(\d+)\s+%%EOF[\x00\t\n\f\r ]*$/.exec(bytes.subarray(-2048).toString("latin1"));
  if (!final) pdfInvalido();
  const offset = Number(final[1]);
  if (!Number.isSafeInteger(offset) || offset < 9 || offset >= bytes.length) pdfInvalido();
  const inicioXref = bytes.subarray(offset, offset + 80).toString("latin1");
  const xrefComprimido = /^(\d+)\s+(\d+)\s+obj\b/.exec(inicioXref);
  if (!/^xref\s/.test(inicioXref) && !xrefComprimido) pdfInvalido();

  try {
    const documento = await PDFDocument.load(bytes, {
      ignoreEncryption: false, throwOnInvalidObject: true, updateMetadata: false,
    });
    if (documento.isEncrypted || !(documento.context.trailerInfo.Root instanceof PDFRef) ||
      documento.catalog.get(PDFName.of("Type")) !== PDFName.of("Catalog")) pdfInvalido();
    if (xrefComprimido) {
      // O pdf-lib consome xref streams sem mantê-los entre os objetos do contexto.
      const xref = PDFObjectParser.forBytes(
        bytes.subarray(offset + xrefComprimido[0].length), documento.context,
      ).parseObject();
      if (!(xref instanceof PDFRawStream) || xref.dict.get(PDFName.of("Type")) !== PDFName.of("XRef")) pdfInvalido();
    }
    const paginas = documento.getPages();
    if (!paginas.length || documento.catalog.Pages().Count().asNumber() !== paginas.length) pdfInvalido();
    for (const pagina of paginas) {
      const { width, height } = pagina.getSize();
      if (![width, height].every((n) => Number.isFinite(n) && n > 0)) pdfInvalido();
    }
  } catch {
    pdfInvalido();
  }
  return { bytes, nome };
}
