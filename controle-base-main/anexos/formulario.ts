import { ErroPdf } from "./erro";
import { MARGEM_MULTIPART } from "./validar-pdf";

// formData() sozinho lê o corpo inteiro antes de aplicar o limite do arquivo.
export async function lerArquivoPdf(request: Request, limite: number) {
  if (!/^multipart\/form-data\s*;/i.test(request.headers.get("content-type") ?? "")) {
    throw new ErroPdf(415, "FORMATO_INVALIDO", "Envie multipart/form-data com o campo arquivo.");
  }
  const maximo = limite + MARGEM_MULTIPART;
  const tamanho = request.headers.get("content-length");
  if (tamanho && (!/^\d+$/.test(tamanho) || !Number.isSafeInteger(Number(tamanho)))) {
    throw new ErroPdf(400, "FORMULARIO_INVALIDO", "Tamanho da requisição inválido.");
  }
  if (tamanho && Number(tamanho) > maximo) {
    throw new ErroPdf(413, "PDF_MUITO_GRANDE", "Requisição acima do limite de upload.");
  }
  const leitor = request.body?.getReader();
  if (!leitor) throw new ErroPdf(400, "FORMULARIO_INVALIDO", "Informe um arquivo PDF.");
  const partes: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      total += value.byteLength;
      if (total > maximo) {
        await leitor.cancel().catch(() => undefined);
        throw new ErroPdf(413, "PDF_MUITO_GRANDE", "Requisição acima do limite de upload.");
      }
      partes.push(value);
    }
  } finally {
    leitor.releaseLock();
  }
  let formulario: FormData;
  try {
    formulario = await new Response(Buffer.concat(partes), { headers: request.headers }).formData();
  } catch {
    throw new ErroPdf(400, "FORMULARIO_INVALIDO", "Formulário de upload inválido.");
  }
  const entradas = Array.from(formulario.entries());
  const arquivo = formulario.get("arquivo");
  if (entradas.length !== 1 || !arquivo || typeof arquivo === "string") {
    throw new ErroPdf(400, "FORMULARIO_INVALIDO", "Envie exatamente um arquivo no campo arquivo.");
  }
  return arquivo;
}
