// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { WorkspaceChat } from "./workspace";
import type { ConversaListada } from "./contratos";
import type { MensagemChat } from "./contratos-mensagens";

const mocks = vi.hoisted(() => {
  const substituir = vi.fn();
  return { substituir, router: { replace: substituir }, remover: vi.fn(), canais: [] as { filtro: Record<string, string>; evento: (dados: unknown) => void }[] };
});
vi.mock("next/navigation", () => ({ useRouter: () => mocks.router }));
vi.mock("../supabase/navegador", () => ({ criarNavegador: () => ({
  channel: () => {
    const canal = { on: (_tipo: string, filtro: Record<string, string>, evento: (dados: unknown) => void) => {
      mocks.canais.push({ filtro, evento }); return canal;
    }, subscribe: () => canal };
    return canal;
  }, removeChannel: mocks.remover,
}) }));

const uuid = (n: number) => `00000000-0000-0000-0000-${String(n).padStart(12, "0")}`;
const usuario = uuid(1), outro = uuid(2), chat = uuid(78), segundo = uuid(79);
const data = "2026-11-20T12:00:00.000000Z";
const conversa = (id: string, titulo: string): ConversaListada => ({ id, titulo, tipo: "direct", criadaEm: data, atualizadaEm: data,
  atividadeEm: data, participantes: [{ usuarioId: usuario, entrouEm: data }, { usuarioId: outro, entrouEm: data }], ultimaMensagem: null, naoLidas: 1 });
const mensagem: MensagemChat = { id: uuid(101), conversaId: chat, remetenteId: outro, criadaEm: data,
  editadaEm: null, tipo: "text", conteudo: "Mensagem recebida real", nomeArquivo: null };
let elemento: HTMLDivElement, raiz: Root, buscar: ReturnType<typeof vi.fn<typeof fetch>>;
let marcada: boolean, revogada: boolean;
let observadores: { elemento: Element; mostrar: () => void }[];

function json(dados: unknown, status = 200) { return Response.json(dados, { status }); }
function requisicoes(metodo: string, trecho: string) {
  return buscar.mock.calls.filter(([url, opcoes]) => (opcoes?.method ?? "GET") === metodo && String(url).includes(trecho));
}
async function montar(admin = false) {
  await act(async () => raiz.render(createElement(WorkspaceChat, { usuarioId: usuario, nome: "Alice", ehAdmin: admin, pdfMaxBytes: 4000000, sair: vi.fn() })));
}
async function selecionar(titulo = "Equipe A") {
  await act(async () => elemento.querySelector<HTMLButtonElement>(`button[aria-label="Abrir ${titulo}"]`)!.click());
}

beforeEach(() => {
  vi.stubGlobal("IS_REACT_ACT_ENVIRONMENT", true);
  mocks.canais.length = 0; mocks.substituir.mockReset(); mocks.remover.mockResolvedValue(undefined);
  marcada = false; revogada = false; observadores = [];
  vi.spyOn(document, "hasFocus").mockReturnValue(true);
  vi.stubGlobal("IntersectionObserver", class {
    constructor(private callback: (entradas: unknown[]) => void) {}
    observe(elemento: Element) { observadores.push({ elemento, mostrar: () => this.callback([{ target: elemento, isIntersecting: true, intersectionRatio: 1 }]) }); }
    disconnect() {}
  });
  buscar = vi.fn<typeof fetch>().mockImplementation(async (entrada, opcoes) => {
    const url = new URL(String(entrada), "https://teamtalk.test");
    const metodo = opcoes?.method ?? "GET";
    if (revogada) return json({ erro: "Acesso revogado." }, 403);
    if (url.pathname === "/api/conversas") return json({ usuarioId: usuario, conversas: [conversa(chat, "Equipe A"), conversa(segundo, "Equipe B")], paginacao: { limite: 50, proximoCursor: null } });
    if (url.pathname === "/api/inbox/preferencias") return json({ usuarioId: usuario, preferencias: url.searchParams.getAll("conversaId").map((conversaId) => ({ conversaId, situacao: "em-conversa", prioridade: "normal", favorita: false })) });
    if (url.pathname.endsWith("/anexos/pdf")) return json({ usuarioId: usuario, mensagem: { ...mensagem, id: uuid(103), remetenteId: usuario, tipo: "pdf", conteudo: null, nomeArquivo: "relatorio.pdf" }, anexo: { tamanhoBytes: 100, downloadUrl: `/api/conversas/${chat}/anexos/${uuid(103)}` } }, 201);
    if (url.pathname.endsWith("/leituras") && metodo === "POST") { marcada = true; return json({ usuarioId: usuario, conversaId: chat, leitura: { mensagemId: mensagem.id, usuarioId: usuario, lidaEm: data } }); }
    if (url.pathname.endsWith("/leituras")) return json({ usuarioId: usuario, conversaId: chat, mensagens: url.searchParams.getAll("mensagemId").map((id) => ({ mensagemId: id, remetenteId: id === mensagem.id ? outro : usuario,
      destinatarios: [{ usuarioId: outro, entrouEm: data, lidaEm: marcada ? data : null }] })) });
    if (url.pathname.endsWith("/mensagens") && metodo === "POST") return json({ usuarioId: usuario, mensagem: { ...mensagem, id: uuid(102), remetenteId: usuario, conteudo: JSON.parse(String(opcoes?.body)).conteudo } }, 201);
    if (url.pathname.endsWith("/mensagens")) {
      const id = url.pathname.includes(segundo) ? segundo : chat;
      return json({ usuarioId: usuario, conversaId: id, mensagens: id === chat ? [mensagem] : [], paginacao: { limite: 50, proximoCursor: null } });
    }
    throw new Error(`Endpoint inesperado: ${metodo} ${url.pathname}`);
  });
  vi.stubGlobal("fetch", buscar);
  elemento = document.createElement("div"); document.body.append(elemento); raiz = createRoot(elemento);
});
afterEach(async () => {
  await act(async () => raiz.unmount()); elemento.remove(); vi.restoreAllMocks(); vi.unstubAllGlobals();
});

describe("workspace integrado por endpoints reais", () => {
  it("carrega a Inbox e preferências, abre o histórico e envia apenas o texto contratado", async () => {
    await montar(true);
    expect(elemento.querySelector('a[href="/admin"]')).not.toBeNull();
    expect(requisicoes("GET", "/api/inbox/preferencias")).toHaveLength(1);
    await selecionar();
    expect(elemento.textContent).toContain("Mensagem recebida real");
    expect(requisicoes("POST", "/leituras")).toHaveLength(0);
    const campo = elemento.querySelector<HTMLInputElement>('input[aria-label="Digite sua mensagem"]')!;
    await act(async () => {
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!.call(campo, "Olá, equipe");
      campo.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await act(async () => elemento.querySelector("form.chat-compositor")!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(JSON.parse(String(requisicoes("POST", "/mensagens")[0][1]?.body))).toEqual({ conteudo: "Olá, equipe" });
    expect(elemento.textContent).toContain("Olá, equipe");
    expect(elemento.querySelector('[aria-label="Mensagem enviada"]')).not.toBeNull();
    marcada = true;
    await act(async () => {
      for (const canal of mocks.canais.filter((c) => c.filtro.table === "message_reads"))
        canal.evento({ new: { message_id: uuid(102) } });
    });
    expect(elemento.querySelector('[aria-label="Mensagem lida"]')).not.toBeNull();
    expect(elemento.textContent).toContain("Leituras por destinatário");
  });

  it("só registra leitura depois da exibição e usa o status real dos destinatários", async () => {
    await montar(); await selecionar();
    expect(marcada).toBe(false);
    await act(async () => {
      observadores.forEach((observador) => observador.mostrar());
      await new Promise((resolve) => setTimeout(resolve, 330));
    });
    expect(requisicoes("POST", "/leituras")).toHaveLength(1);
    expect(JSON.parse(String(requisicoes("POST", "/leituras")[0][1]?.body))).toEqual({ exibida: true });
    expect(marcada).toBe(true);
  });

  it("integra o seletor, envia multipart e oferece a URL autenticada do PDF", async () => {
    await montar(); await selecionar();
    const entrada = elemento.querySelector<HTMLInputElement>('input[type="file"]')!;
    const arquivo = new File(["%PDF-teste"], "relatorio.pdf", { type: "application/pdf" });
    await act(async () => {
      Object.defineProperty(entrada, "files", { value: [arquivo], configurable: true });
      entrada.dispatchEvent(new Event("change", { bubbles: true }));
    });
    const botao = [...elemento.querySelectorAll("button")].find((b) => b.textContent === "Enviar PDF")!;
    await act(async () => botao.click());
    expect((requisicoes("POST", "/anexos/pdf")[0][1]?.body as FormData).get("arquivo")).toBe(arquivo);
    expect(elemento.querySelector(`a[href="/api/conversas/${chat}/anexos/${uuid(103)}"]`)?.textContent).toContain("relatorio.pdf");
  });

  it("bloqueia PDF acima de 4.000.000 bytes antes de chamar o servidor", async () => {
    await montar(); await selecionar();
    const entrada = elemento.querySelector<HTMLInputElement>('input[type="file"]')!;
    const arquivo = new File([new Uint8Array(4000001)], "grande.pdf", { type: "application/pdf" });
    await act(async () => {
      Object.defineProperty(entrada, "files", { value: [arquivo], configurable: true });
      entrada.dispatchEvent(new Event("change", { bubbles: true }));
    });
    expect(elemento.querySelector('[role="alert"]')).not.toBeNull();
    expect(requisicoes("POST", "/anexos/pdf")).toHaveLength(0);
  });

  it("limpa dados e retorna ao login após revogação detectada pela API", async () => {
    await montar(); await selecionar(); revogada = true;
    await act(async () => window.dispatchEvent(new Event("focus")));
    expect(mocks.substituir).toHaveBeenCalledWith("/login?erro=acesso");
    expect(elemento.textContent).not.toContain("Mensagem recebida real");
    expect(elemento.querySelector('a[href="/admin"]')).toBeNull();
  });

  it("descarta histórico atrasado de uma conversa anterior e encerra os canais", async () => {
    await montar();
    const original = buscar.getMockImplementation()!;
    let liberar!: (r: Response) => void;
    buscar.mockImplementation((url, opcoes) => String(url).includes(`${chat}/mensagens`) && !opcoes?.method
      ? new Promise((resolve) => { liberar = resolve; }) : original(url, opcoes));
    await selecionar(); await selecionar("Equipe B");
    await act(async () => liberar(json({ usuarioId: usuario, conversaId: chat, mensagens: [mensagem], paginacao: { limite: 50, proximoCursor: null } })));
    expect(elemento.textContent).not.toContain("Mensagem recebida real");
    expect(mocks.remover).toHaveBeenCalled();
  });
});
