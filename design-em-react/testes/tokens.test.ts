import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const ler = (arquivo: string) => readFileSync(fileURLToPath(new URL(arquivo, import.meta.url)), "utf8");
const css = ler("../estilos/tokens.css");
const tokens = Object.fromEntries(Array.from(css.matchAll(/(--[\w-]+):\s*([^;]+);/g), ([, nome, valor]) => [nome, valor]));

function luminancia(cor: string) {
  const rgb = cor.replace("#", "").match(/../g)!.map((hex) => parseInt(hex, 16) / 255)
    .map((valor) => valor <= .04045 ? valor / 12.92 : ((valor + .055) / 1.055) ** 2.4);
  return .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
}

function contraste(a: string, b: string) {
  const valores = [luminancia(tokens[a]), luminancia(tokens[b])].sort((x, y) => y - x);
  return (valores[0] + .05) / (valores[1] + .05);
}

describe("contratos visuais", () => {
  it.each([
    ["--cor-texto", "--cor-superficie"], ["--cor-secundaria", "--cor-superficie"],
    ["--cor-secundaria", "--cor-fundo"], ["--cor-primaria", "--cor-superficie"],
    ["--cor-primaria", "--cor-selecionada"], ["--cor-primaria-hover", "--cor-superficie"],
    ["--cor-erro", "--cor-superficie"], ["--cor-erro", "--cor-erro-fundo"],
    ["--cor-sucesso", "--cor-sucesso-fundo"], ["--cor-atencao", "--cor-atencao-fundo"],
    ["--cor-informacao", "--cor-informacao-fundo"],
  ])("mantém contraste AA de texto entre %s e %s", (texto, fundo) => {
    expect(contraste(texto, fundo)).toBeGreaterThanOrEqual(4.5);
  });

  it.each(["--cor-borda-controle", "--cor-foco"])("mantém contraste de controle/foco %s", (token) => {
    expect(contraste(token, "--cor-superficie")).toBeGreaterThanOrEqual(3);
  });

  it("preserva alvos físicos de pelo menos 44px e cores usadas pelos PRs existentes", () => {
    expect(parseFloat(tokens["--toque-minimo"])).toBeGreaterThanOrEqual(44);
    expect(parseFloat(tokens["--toque-confortavel"])).toBeGreaterThanOrEqual(parseFloat(tokens["--toque-minimo"]));
    expect(tokens["--cor-primaria"]).toBe("#176b5b");
    expect(tokens["--cor-texto"]).toBe("#173a35");
    expect(ler("../estilos.css")).toContain('@import "./estilos/tokens.css"');
  });

  it("habilita safe areas sem impedir ampliação da página", () => {
    const layout = ler("../../base(tempval)/src/app/layout.tsx");
    expect(layout).toContain('viewportFit: "cover"');
    expect(layout).not.toMatch(/userScalable:\s*false|maximumScale:\s*1/);
  });
});
