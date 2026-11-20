// @vitest-environment jsdom
import { act, createElement, useState } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SeletorAnexoPdf } from "@design/componentes/seletor-anexo-pdf";

const limite = 1024;
const alterar = vi.fn();
let container: HTMLDivElement;
let raiz: Root;

function CompositorTeste({ desabilitado = false, maximo = limite }) {
  const [arquivo, definirArquivo] = useState<File | null>(null);
  return createElement(SeletorAnexoPdf, {
    arquivo,
    limiteMaximoBytes: maximo,
    desabilitado,
    aoAlterarArquivo: (novo) => {
      alterar(novo);
      definirArquivo(novo);
    },
  });
}

function entrada(): HTMLInputElement {
  return container.querySelector("input[type=file]")!;
}

function selecionar(arquivo?: File) {
  Object.defineProperty(entrada(), "files", { configurable: true, value: arquivo ? [arquivo] : [] });
  act(() => { entrada().dispatchEvent(new Event("change", { bubbles: true })); });
}

function pdf(nome = "relatorio.pdf", tamanho = 512) {
  return new File([new Uint8Array(tamanho)], nome, { type: "application/pdf" });
}

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  alterar.mockClear();
  container = document.createElement("div");
  document.body.append(container);
  raiz = createRoot(container);
  act(() => { raiz.render(createElement(CompositorTeste)); });
});

afterEach(() => {
  act(() => { raiz.unmount(); });
  container.remove();
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

describe("SeletorAnexoPdf", () => {
  it("oferece somente PDF, rótulo e limite associados ao seletor nativo", () => {
    expect(entrada().accept).toBe("application/pdf,.pdf");
    expect(entrada().multiple).toBe(false);
    expect(entrada().labels?.[0].textContent).toBe("Anexar PDF");
    const ajuda = document.getElementById(entrada().getAttribute("aria-describedby")!);
    expect(ajuda?.textContent).toContain("1 KB");
    expect(container.querySelector('[role="group"]')?.getAttribute("aria-labelledby")).toBeTruthy();
  });

  it("informa nome e tamanho de PDF válido e passa o File original ao compositor", () => {
    const arquivo = pdf("Relatório do mês.PDF");
    selecionar(arquivo);
    expect(alterar).toHaveBeenCalledExactlyOnceWith(arquivo);
    expect(container.querySelector('[role="status"]')?.textContent).toContain(arquivo.name);
    expect(container.querySelector('[role="status"]')?.textContent).toContain("512 B");
    expect(entrada().labels?.[0].textContent).toBe("Substituir PDF");
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(entrada().value).toBe("");
  });

  it.each([
    ["imagem.png", "image/png"],
    ["audio.mp3", "audio/mpeg"],
    ["video.mp4", "video/mp4"],
    ["documento.doc", "application/msword"],
    ["planilha.xls", "application/vnd.ms-excel"],
    ["imagem-renomeada.pdf", "image/jpeg"],
  ])("bloqueia %s antes do callback e associa o alerta ao campo", (nome, type) => {
    selecionar(new File(["conteudo"], nome, { type }));
    expect(alterar).not.toHaveBeenCalled();
    const erro = container.querySelector('[role="alert"]')!;
    expect(erro.textContent).toContain("somente arquivos PDF");
    expect(entrada().getAttribute("aria-describedby")?.split(" ")).toContain(erro.id);
    expect(entrada().getAttribute("aria-invalid")).toBe("true");
    expect(entrada().value).toBe("");
  });

  it("bloqueia PDF acima do limite e libera nova seleção após erro", () => {
    selecionar(pdf("grande.pdf", limite + 1));
    expect(alterar).not.toHaveBeenCalled();
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("excede o limite de 1 KB");
    selecionar(pdf());
    expect(alterar).toHaveBeenCalledOnce();
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(entrada().getAttribute("aria-invalid")).toBe("false");
  });

  it("substitui por outro PDF e mantém o anterior após uma substituição inválida ou cancelada", () => {
    selecionar(pdf("primeiro.pdf"));
    const segundo = pdf("segundo.pdf");
    selecionar(segundo);
    selecionar(new File(["foto"], "foto.jpg", { type: "image/jpeg" }));
    selecionar();
    expect(alterar).toHaveBeenCalledTimes(2);
    expect(alterar).toHaveBeenLastCalledWith(segundo);
    expect(container.querySelector('[role="status"]')?.textContent).toContain("segundo.pdf");
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("anteriormente foi mantido");
  });

  it("remove sem submeter o formulário, devolve o foco e permite selecionar o mesmo PDF", () => {
    const arquivo = pdf();
    selecionar(arquivo);
    const remover = container.querySelector("button")!;
    expect(remover.type).toBe("button");
    act(() => { remover.click(); });
    expect(alterar).toHaveBeenLastCalledWith(null);
    expect(container.querySelector('[role="status"]')?.textContent).toContain("Nenhum PDF");
    expect(document.activeElement).toBe(entrada());
    selecionar(arquivo);
    expect(alterar).toHaveBeenLastCalledWith(arquivo);
    expect(alterar).toHaveBeenCalledTimes(3);
  });

  it("respeita a desabilitação durante envio, inclusive para remover", () => {
    selecionar(pdf());
    act(() => { raiz.render(createElement(CompositorTeste, { desabilitado: true })); });
    expect(entrada().disabled).toBe(true);
    expect(container.querySelector("button")?.disabled).toBe(true);
    selecionar(pdf("outro.pdf"));
    act(() => { container.querySelector("button")!.click(); });
    expect(alterar).toHaveBeenCalledOnce();
  });

  it("revalida quando o limite recebido por props diminui", () => {
    selecionar(pdf());
    act(() => { raiz.render(createElement(CompositorTeste, { maximo: 100 })); });
    expect(container.querySelector('[role="alert"]')?.textContent).toContain("100 B");
    expect(entrada().getAttribute("aria-invalid")).toBe("true");
  });
});
