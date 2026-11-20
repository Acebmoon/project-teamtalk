// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ConversasInbox } from "./conversas";
import { PREFERENCIA_PADRAO, type PreferenciaConversa } from "./contratos";

const alice = "00000000-0000-0000-0000-000000000001";
const bob = "00000000-0000-0000-0000-000000000002";
const conversa = "00000000-0000-0000-0000-000000000098";
let elemento: HTMLDivElement;
let raiz: Root;
let conta: string;
let salvas: Map<string, PreferenciaConversa>;
let buscar: ReturnType<typeof vi.fn<typeof fetch>>;

function resposta(usuario = conta) {
  return Response.json({ usuarioId: usuario, preferencias: [salvas.get(usuario) ?? { conversaId: conversa, ...PREFERENCIA_PADRAO }] });
}
function tela(usuarioId = conta, ids = [conversa]) {
  return createElement(ConversasInbox, {
    usuarioId,
    conversas: ids.map((id) => ({ id, titulo: `Equipe ${id}`, avatarTexto: "EQ" })),
    mensagens: [], aoSelecionarConversa: vi.fn(), aoEnviarMensagem: vi.fn().mockResolvedValue(undefined),
  });
}
const prioridade = () => elemento.querySelector<HTMLSelectElement>('select[aria-label^="Prioridade"]')!;
const favorito = () => elemento.querySelector<HTMLButtonElement>(".workspace-favorito")!;

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  conta = alice;
  salvas = new Map();
  buscar = vi.fn<typeof fetch>().mockImplementation(async (_url, opcoes) => {
    if (opcoes?.method === "PUT") salvas.set(conta, JSON.parse(String(opcoes.body)).preferencias[0]);
    return resposta();
  });
  vi.stubGlobal("fetch", buscar);
  elemento = document.createElement("div");
  document.body.append(elemento);
  raiz = createRoot(elemento);
});
afterEach(async () => {
  await act(async () => raiz.unmount());
  elemento.remove();
  vi.unstubAllGlobals();
});

describe("TelaConversas do PR #97 integrada por props", () => {
  it("persiste prioridade/favorito e recupera ambos após remontar a tela", async () => {
    await act(async () => raiz.render(tela()));
    expect(prioridade().value).toBe("normal");
    await act(async () => {
      prioridade().value = "urgente";
      prioridade().dispatchEvent(new Event("change", { bubbles: true }));
    });
    await act(async () => favorito().click());
    expect(salvas.get(alice)).toEqual({ conversaId: conversa, prioridade: "urgente", situacao: "em-conversa", favorita: true });
    await act(async () => raiz.render(null));
    await act(async () => raiz.render(tela()));
    expect(prioridade().value).toBe("urgente");
    expect(favorito().getAttribute("aria-pressed")).toBe("true");
  });
  it("limpa preferências na troca de usuário, antes da resposta de carregamento", async () => {
    salvas.set(alice, { conversaId: conversa, prioridade: "alta", situacao: "em-conversa", favorita: true });
    await act(async () => raiz.render(tela()));
    expect(prioridade().value).toBe("alta");
    conta = bob;
    let liberar!: (valor: Response) => void;
    buscar.mockImplementationOnce(() => new Promise((resolve) => { liberar = resolve; }));
    await act(async () => raiz.render(tela()));
    expect(prioridade().value).toBe("normal");
    expect(prioridade().disabled).toBe(true);
    expect(favorito().getAttribute("aria-pressed")).toBe("false");
    await act(async () => liberar(resposta(bob)));
    expect(prioridade().disabled).toBe(false);
    expect(salvas.get(alice)?.prioridade).toBe("alta");
  });
  it("ignora resposta atrasada de uma conta anterior", async () => {
    let liberar!: (valor: Response) => void;
    buscar.mockImplementationOnce(() => new Promise((resolve) => { liberar = resolve; }));
    await act(async () => raiz.render(tela()));
    conta = bob;
    await act(async () => raiz.render(tela()));
    salvas.set(alice, { conversaId: conversa, prioridade: "urgente", situacao: "em-conversa", favorita: true });
    await act(async () => liberar(resposta(alice)));
    expect(prioridade().value).toBe("normal");
    expect(favorito().getAttribute("aria-pressed")).toBe("false");
  });
  it("não confirma gravação malsucedida e permite recarregar", async () => {
    await act(async () => raiz.render(tela()));
    buscar.mockResolvedValueOnce(Response.json({ erro: "Conversa indisponível." }, { status: 404 }));
    await act(async () => favorito().click());
    expect(favorito().getAttribute("aria-pressed")).toBe("false");
    expect(elemento.querySelector('[role="alert"]')).not.toBeNull();
    const tentar = [...elemento.querySelectorAll("button")].find((botao) => botao.textContent === "Tentar novamente")!;
    await act(async () => tentar.click());
    expect(elemento.querySelector('[role="alert"]')).toBeNull();
    expect(prioridade().disabled).toBe(false);
  });
  it("mantém o estado confirmado e bloqueia nova ação enquanto salva", async () => {
    await act(async () => raiz.render(tela()));
    let liberar!: (valor: Response) => void;
    buscar.mockImplementationOnce(() => new Promise((resolve) => { liberar = resolve; }));
    await act(async () => favorito().click());
    expect(prioridade().disabled).toBe(true);
    expect(favorito().getAttribute("aria-pressed")).toBe("false");
    salvas.set(alice, { conversaId: conversa, ...PREFERENCIA_PADRAO, favorita: true });
    await act(async () => liberar(resposta()));
    expect(favorito().getAttribute("aria-pressed")).toBe("true");
    expect(prioridade().disabled).toBe(false);
  });
  it("não envia consulta vazia", async () => {
    await act(async () => raiz.render(tela(conta, [])));
    expect(buscar).not.toHaveBeenCalled();
    expect(elemento.textContent).toContain("Suas conversas aparecerão aqui.");
  });
  it("divide páginas acumuladas em lotes de até 50 conversas", async () => {
    const ids = Array.from({ length: 51 }, (_, indice) => `00000000-0000-0000-0000-${String(indice + 100).padStart(12, "0")}`);
    buscar.mockImplementation(async (url) => Response.json({
      usuarioId: alice,
      preferencias: new URL(String(url), "https://teamtalk.test").searchParams.getAll("conversaId")
        .map((conversaId) => ({ conversaId, ...PREFERENCIA_PADRAO })),
    }));
    await act(async () => raiz.render(tela(conta, ids)));
    expect(buscar).toHaveBeenCalledTimes(2);
    expect(new URL(String(buscar.mock.calls[0][0]), "https://teamtalk.test").searchParams.getAll("conversaId")).toHaveLength(50);
    expect(new URL(String(buscar.mock.calls[1][0]), "https://teamtalk.test").searchParams.getAll("conversaId")).toHaveLength(1);
  });
});
