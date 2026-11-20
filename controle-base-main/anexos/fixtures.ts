import { PDFDocument } from "pdf-lib";

export async function criarPdfTeste(comprimido = true) {
  const documento = await PDFDocument.create();
  documento.addPage([100, 100]);
  return Buffer.from(await documento.save({ useObjectStreams: comprimido }));
}

export const CONVERSA = "11111111-1111-4111-8111-111111111111";
export const USUARIO = "22222222-2222-4222-8222-222222222222";
export const MENSAGEM = "33333333-3333-4333-8333-333333333333";
export const OBJETO = "44444444-4444-4444-8444-444444444444";
