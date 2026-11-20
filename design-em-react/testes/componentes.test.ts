// @vitest-environment jsdom
import { act, createElement } from "react";
import type { ReactNode } from "react";
import { createRoot } from "react-dom/client";
import type { Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { Badge, Botao, CabecalhoMobile, Campo, LayoutMobile, NavegacaoMobile } from "@design/componentes";
import { GaleriaDesignSystem } from "@design/exemplos/galeria";

let container: HTMLDivElement;
let raiz: Root;
const montar = (conteudo: ReactNode) => act(() => { raiz.render(conteudo); });

beforeEach(() => {
  Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });
  container = document.createElement("div");
  document.body.append(container);
  raiz = createRoot(container);
});

afterEach(() => {
  act(() => { raiz.unmount(); });
  container.remove();
  Reflect.deleteProperty(globalThis, "IS_REACT_ACT_ENVIRONMENT");
});

describe("Botao", () => {
  it("não submete formulários por padrão e repassa a ação", () => {
    const executar = vi.fn();
    montar(createElement(Botao, { onClick: executar }, "Continuar"));
    const botao = container.querySelector("button")!;
    expect(botao.type).toBe("button");
    act(() => { botao.click(); });
    expect(executar).toHaveBeenCalledOnce();
  });

  it.each(["primaria", "secundaria", "discreta", "perigo"] as const)("oferece a variante %s com nome acessível", (variante) => {
    montar(createElement(Botao, { variante, "aria-label": "Executar ação" }, "Executar"));
    expect(container.querySelector("button")?.dataset.variante).toBe(variante);
    expect(container.querySelector("button")?.getAttribute("aria-label")).toBe("Executar ação");
  });

  it("permite submit explícito e preserva dados nativos do formulário", () => {
    montar(createElement(Botao, { type: "submit", name: "acao", value: "salvar" }, "Salvar"));
    expect(container.querySelector("button")?.type).toBe("submit");
    expect(container.querySelector("button")?.name).toBe("acao");
    expect(container.querySelector("button")?.value).toBe("salvar");
  });

  it.each([{ ocupado: true }, { disabled: true }])("bloqueia cliques em %o", (props) => {
    const executar = vi.fn();
    montar(createElement(Botao, { ...props, onClick: executar }, "Salvar"));
    const botao = container.querySelector("button")!;
    expect(botao.disabled).toBe(true);
    act(() => { botao.click(); });
    expect(executar).not.toHaveBeenCalled();
    if ("ocupado" in props) {
      expect(botao.getAttribute("aria-busy")).toBe("true");
      expect(botao.textContent).toContain("Em andamento.");
    }
  });
});

describe("Campo", () => {
  it("associa rótulo, ajuda e erro, preservando descrição fornecida", () => {
    montar(createElement(Campo, { id: "email", rotulo: "E-mail", ajuda: "Corporativo", erro: "Inválido", "aria-describedby": "politica" }));
    const campo = container.querySelector("input")!;
    expect(campo.labels?.[0].textContent).toBe("E-mail");
    expect(campo.getAttribute("aria-describedby")).toBe("politica email-ajuda email-erro");
    expect(campo.getAttribute("aria-invalid")).toBe("true");
    expect(container.querySelector('[role="alert"]')?.id).toBe("email-erro");
  });

  it("remove o erro após atualização das props sem perder o id", () => {
    montar(createElement(Campo, { id: "email", rotulo: "E-mail", erro: "Inválido" }));
    montar(createElement(Campo, { id: "email", rotulo: "E-mail", ajuda: "Corporativo" }));
    expect(container.querySelector('[role="alert"]')).toBeNull();
    expect(container.querySelector("input")?.id).toBe("email");
    expect(container.querySelector("input")?.getAttribute("aria-describedby")).toBe("email-ajuda");
    expect(container.querySelector("input")?.getAttribute("aria-invalid")).toBeNull();
  });

  it.each(["current-password", "new-password", "username"])("preserva autocomplete %s e restrições nativas", (autoComplete) => {
    montar(createElement(Campo, { id: "credencial", rotulo: "Credencial", autoComplete, required: true, minLength: 10, maxLength: 72, name: "senha", type: "password", enterKeyHint: "go" }));
    const campo = container.querySelector("input")!;
    expect(campo.autocomplete).toBe(autoComplete);
    expect(campo.required).toBe(true);
    expect(campo.minLength).toBe(10);
    expect(campo.maxLength).toBe(72);
    expect(campo.name).toBe("senha");
    expect(campo.type).toBe("password");
    expect(campo.getAttribute("enterkeyhint")).toBe("go");
  });

  it("preserva leitura e desabilitação sem salvar credenciais", () => {
    montar(createElement(Campo, { id: "email", rotulo: "E-mail", value: "corporativo", readOnly: true, disabled: true }));
    expect(container.querySelector("input")?.readOnly).toBe(true);
    expect(container.querySelector("input")?.disabled).toBe(true);
    expect(container.querySelector("input")?.value).toBe("corporativo");
  });
});

describe("Badge e cabeçalho", () => {
  it.each(["neutro", "sucesso", "atencao", "erro", "informacao"] as const)("distingue o estado %s também pelo texto", (tom) => {
    montar(createElement(Badge, { tom }, "Estado descritivo"));
    expect(container.textContent).toBe("Estado descritivo");
    expect(container.querySelector("span")?.dataset.tom).toBe(tom);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it("mostra retorno apenas quando o callback existe e não inventa ações", () => {
    montar(createElement(CabecalhoMobile, { titulo: "Conversas" }));
    expect(container.querySelector("button")).toBeNull();
    const voltar = vi.fn();
    montar(createElement(CabecalhoMobile, { titulo: "Conversa", subtitulo: "Equipe", aoVoltar: voltar, rotuloVoltar: "Voltar para conversas" }));
    expect(container.querySelector("h1")?.textContent).toBe("Conversa");
    const botao = container.querySelector("button")!;
    expect(botao.getAttribute("aria-label")).toBe("Voltar para conversas");
    act(() => { botao.click(); });
    expect(voltar).toHaveBeenCalledOnce();
  });
});

describe("Navegação controlada e layout", () => {
  const itens = [
    { id: "conversas", rotulo: "Conversas", contagem: 105, icone: "✉" },
    { id: "conta", rotulo: "Conta" },
    { id: "indisponivel", rotulo: "Indisponível", desabilitado: true },
  ];

  it("informa a seleção sem mudar o destino até receber novas props", () => {
    const selecionar = vi.fn();
    montar(createElement(NavegacaoMobile, { itens, ativoId: "conversas", aoSelecionar: selecionar }));
    expect(container.querySelector("nav")?.getAttribute("aria-label")).toBe("Navegação principal");
    const botoes = container.querySelectorAll("button");
    act(() => { botoes[1].click(); });
    expect(selecionar).toHaveBeenCalledExactlyOnceWith("conta");
    expect(botoes[0].getAttribute("aria-current")).toBe("page");
    montar(createElement(NavegacaoMobile, { itens, ativoId: "conta", aoSelecionar: selecionar }));
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(1);
    expect(container.querySelector('[aria-current="page"]')?.textContent).toBe("Conta");
  });

  it("oferece texto de contagem completa e ignora destinos desabilitados", () => {
    const selecionar = vi.fn();
    montar(createElement(NavegacaoMobile, { itens, ativoId: "conversas", aoSelecionar: selecionar }));
    expect(container.querySelector('[aria-label="105 não lidas"]')?.textContent).toBe("99+");
    expect(container.querySelector('[aria-hidden="true"]')?.textContent).toBe("✉");
    act(() => { container.querySelectorAll("button")[2].click(); });
    expect(selecionar).not.toHaveBeenCalled();
    expect(Array.from(container.querySelectorAll("button")).every((botao) => botao.type === "button")).toBe(true);
  });

  it.each([0, -1, Number.NaN, Number.POSITIVE_INFINITY, 1.5])("omite contagem inválida ou vazia %s", (contagem) => {
    montar(createElement(NavegacaoMobile, { itens: [{ id: "conversas", rotulo: "Conversas", contagem }], ativoId: "conversas", aoSelecionar: vi.fn() }));
    expect(container.querySelector("button")?.textContent).toBe("Conversas");
  });

  it("não cria destino administrativo e associa o salto ao conteúdo principal", () => {
    montar(createElement(LayoutMobile, {
      idConteudo: "mensagens", cabecalho: createElement(CabecalhoMobile, { titulo: "Conversas" }),
      navegacao: createElement(NavegacaoMobile, { itens: itens.slice(0, 2), ativoId: "conversas", aoSelecionar: vi.fn() }),
    }, "Conteúdo"));
    expect(container.querySelectorAll("main")).toHaveLength(1);
    expect(container.querySelector("main")?.id).toBe("mensagens");
    expect(container.querySelector("main")?.tabIndex).toBe(-1);
    expect(container.querySelector("a")?.getAttribute("href")).toBe("#mensagens");
    expect(container.textContent).not.toContain("Admin");
  });

  it("permite navegar na galeria, voltar e executar uma ação por callbacks", () => {
    montar(createElement(GaleriaDesignSystem));
    const clicar = (texto: string) => act(() => { Array.from(container.querySelectorAll("button")).find((botao) => botao.textContent === texto)!.click(); });
    clicar("Orientações");
    expect(container.querySelector("h2")?.textContent).toBe("Navegação no celular");
    act(() => { container.querySelector<HTMLButtonElement>('[aria-label="Voltar para componentes"]')!.click(); });
    clicar("Ação principal");
    expect(container.querySelector('[role="status"]')?.textContent).toBe("Ação de exemplo concluída.");
    clicar("Limpar feedback");
    expect(container.querySelector('[role="status"]')).toBeNull();
  });
});
