import { describe, expect, it, vi } from "vitest";
import { lerArquivoPdf } from "./formulario";
import { MARGEM_MULTIPART } from "./validar-pdf";

function requisicao(formulario: FormData) {
  return new Request("http://localhost/upload", { method: "POST", body: formulario });
}

describe("leitura limitada de multipart", () => {
  it("recebe um único campo arquivo", async () => {
    const form = new FormData();
    form.set("arquivo", new File(["%PDF-1.7"], "arquivo.pdf", { type: "application/pdf" }));
    expect((await lerArquivoPdf(requisicao(form), 1024)).name).toBe("arquivo.pdf");
  });

  it.each(["ausente", "texto", "duplicado", "campo-extra"])("rejeita formulário %s", async (tipo) => {
    const form = new FormData();
    if (tipo === "texto") form.set("arquivo", "falso.pdf");
    if (tipo === "duplicado" || tipo === "campo-extra") {
      form.append("arquivo", new File(["pdf"], "arquivo.pdf"));
      form.append(tipo === "duplicado" ? "arquivo" : "sender_id", new File(["pdf"], "outro.pdf"));
    }
    await expect(lerArquivoPdf(requisicao(form), 1024)).rejects.toMatchObject({ status: 400 });
  });

  it("rejeita Content-Length grande antes da leitura", async () => {
    const request = new Request("http://localhost/upload", { method: "POST", body: "x",
      headers: { "content-type": "multipart/form-data; boundary=x", "content-length": String(MARGEM_MULTIPART + 1000) } });
    const leitura = vi.spyOn(request.body!, "getReader");
    await expect(lerArquivoPdf(request, 100)).rejects.toMatchObject({ status: 413 });
    expect(leitura).not.toHaveBeenCalled();
  });

  it("cancela corpo acima do limite sem Content-Length ou com tamanho falso", async () => {
    for (const tamanho of [undefined, "1"]) {
      const cancelar = vi.fn();
      const corpo = new ReadableStream<Uint8Array>({
        start(controle) { controle.enqueue(new Uint8Array(MARGEM_MULTIPART + 1025)); }, cancel: cancelar,
      });
      const headers = new Headers({ "content-type": "multipart/form-data; boundary=x" });
      if (tamanho) headers.set("content-length", tamanho);
      const request = new Request("http://localhost/upload", { method: "POST", body: corpo, headers, duplex: "half" } as RequestInit);
      await expect(lerArquivoPdf(request, 1024)).rejects.toMatchObject({ status: 413 });
      expect(cancelar).toHaveBeenCalled();
    }
  });

  it("rejeita JSON e multipart malformado", async () => {
    await expect(lerArquivoPdf(new Request("http://localhost", { method: "POST", body: "{}" }), 100))
      .rejects.toMatchObject({ status: 415 });
    await expect(lerArquivoPdf(new Request("http://localhost", { method: "POST", body: "quebrado",
      headers: { "content-type": "multipart/form-data; boundary=x" } }), 100))
      .rejects.toMatchObject({ status: 400 });
  });
});
