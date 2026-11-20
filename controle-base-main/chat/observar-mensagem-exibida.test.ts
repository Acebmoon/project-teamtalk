import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { observarMensagemExibida } from "./observar-mensagem-exibida";

const conversaId = "00000000-0000-0000-0000-000000000080";
const id = "00000000-0000-0000-0000-000000000081";
const opcoes = { usuarioId: "destinatario", conversaId,
  mensagem: { id, conversaId, remetenteId: "autor" }, aoConfirmar: vi.fn(), aoErro: vi.fn() };
const fetchMock = vi.fn();
const observe = vi.fn();
const disconnect = vi.fn();
let notificar: IntersectionObserverCallback;
let documento: EventTarget & { visibilityState: string; hasFocus: ReturnType<typeof vi.fn>; defaultView: EventTarget & { getComputedStyle: ReturnType<typeof vi.fn> } };
let elemento: HTMLElement;
const limpezas: (() => void)[] = [];
function iniciar(opcoesAtuais = opcoes) { const encerrar = observarMensagemExibida(elemento, opcoesAtuais); limpezas.push(encerrar); return encerrar; }
function intersecao(ratio = 1) {
  notificar([{ target: elemento, isIntersecting: ratio > 0, intersectionRatio: ratio } as unknown as IntersectionObserverEntry], {} as IntersectionObserver);
}
const aguardar = () => vi.advanceTimersByTimeAsync(300);

beforeEach(() => {
  vi.resetAllMocks(); vi.useFakeTimers();
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockImplementation(async () => Response.json({ usuarioId: "destinatario", conversaId,
    leitura: { mensagemId: id, usuarioId: "destinatario", lidaEm: "agora" } }));
  vi.stubGlobal("IntersectionObserver", class {
    observe = observe; disconnect = disconnect;
    constructor(callback: IntersectionObserverCallback) { notificar = callback; }
  });
  documento = Object.assign(new EventTarget(), { visibilityState: "visible", hasFocus: vi.fn(() => true),
    defaultView: Object.assign(new EventTarget(), { getComputedStyle: vi.fn(() => ({ display: "block", visibility: "visible", opacity: "1" })) }) });
  elemento = { ownerDocument: documento, isConnected: true, parentElement: null } as unknown as HTMLElement;
});
afterEach(() => { limpezas.splice(0).forEach((encerrar) => encerrar()); vi.useRealTimers(); vi.unstubAllGlobals(); });

describe("marcação somente após exibição efetiva", () => {
  it("não marca no carregamento ou só por montar o balão", async () => {
    iniciar(); await aguardar();
    expect(observe).toHaveBeenCalledWith(elemento);
    expect(fetchMock).not.toHaveBeenCalled();
    intersecao(0); await aguardar();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("confirma uma única vez após área visível por 300 ms", async () => {
    iniciar(); intersecao();
    await vi.advanceTimersByTimeAsync(299);
    expect(fetchMock).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(opcoes.aoConfirmar).toHaveBeenCalledWith(expect.objectContaining({ usuarioId: "destinatario" }));
    intersecao(); await aguardar();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("aceita mensagem maior que o viewport, parcialmente exibida", async () => {
    iniciar(); intersecao(0.1); await aguardar();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("cancela o tempo se a mensagem sair de vista antes de 300 ms", async () => {
    iniciar(); intersecao(); await vi.advanceTimersByTimeAsync(150);
    intersecao(0); await aguardar();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("não marca mensagens próprias nem de outra conversa ativa", async () => {
    iniciar({ ...opcoes, usuarioId: "autor" });
    iniciar({ ...opcoes, conversaId: "outra" }); await aguardar();
    expect(observe).not.toHaveBeenCalled();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("não marca documento oculto, e reavalia ao voltar para a aba", async () => {
    documento.visibilityState = "hidden";
    iniciar(); intersecao(); await aguardar();
    expect(fetchMock).not.toHaveBeenCalled();
    documento.visibilityState = "visible";
    documento.dispatchEvent(new Event("visibilitychange")); await aguardar();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it("não marca janela sem foco e cancela temporizador ao perder foco", async () => {
    iniciar(); intersecao(); await vi.advanceTimersByTimeAsync(150);
    documento.hasFocus.mockReturnValue(false);
    documento.defaultView.dispatchEvent(new Event("blur")); await aguardar();
    expect(fetchMock).not.toHaveBeenCalled();
    documento.hasFocus.mockReturnValue(true);
    documento.defaultView.dispatchEvent(new Event("focus")); await aguardar();
    expect(fetchMock).toHaveBeenCalledOnce();
  });
  it.each([{ display: "none" }, { visibility: "hidden" }, { opacity: "0" }])("não marca elemento/ancestral escondido por CSS: %j", async (estilo) => {
    documento.defaultView.getComputedStyle.mockReturnValue({ display: "block", visibility: "visible", opacity: "1", ...estilo });
    iniciar(); intersecao(); await aguardar();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("confere também o estilo dos ancestrais", async () => {
    Object.assign(elemento, { parentElement: { parentElement: null } });
    documento.defaultView.getComputedStyle.mockImplementation((alvo) => ({ display: "block", visibility: "visible", opacity: alvo === elemento ? "1" : "0" }));
    iniciar(); intersecao(); await aguardar();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("não marca elemento desconectado do documento", async () => {
    iniciar(); intersecao(); Object.assign(elemento, { isConnected: false }); await aguardar();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("desmontagem/troca de conversa cancela observação e callback atrasado", async () => {
    let concluir!: (resposta: Response) => void;
    fetchMock.mockReturnValueOnce(new Promise<Response>((resolve) => { concluir = resolve; }));
    const encerrar = iniciar(); intersecao(); await aguardar();
    const signal = fetchMock.mock.calls[0][1].signal as AbortSignal;
    encerrar(); expect(signal.aborted).toBe(true);
    concluir(Response.json({})); await vi.advanceTimersByTimeAsync(0);
    documento.defaultView.dispatchEvent(new Event("focus")); intersecao(); await aguardar();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalled();
    expect(opcoes.aoConfirmar).not.toHaveBeenCalled();
    expect(opcoes.aoErro).not.toHaveBeenCalled();
  });
  it("cancela a confirmação ainda não enviada no cleanup", async () => {
    const encerrar = iniciar(); intersecao(); encerrar(); await aguardar();
    expect(fetchMock).not.toHaveBeenCalled();
  });
  it("não confirma em erro de rede e permite repetir quando voltar a ficar visível", async () => {
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    iniciar(); intersecao(); await aguardar();
    expect(opcoes.aoErro).toHaveBeenCalledOnce();
    expect(opcoes.aoConfirmar).not.toHaveBeenCalled();
    intersecao(0); intersecao(); await aguardar();
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(opcoes.aoConfirmar).toHaveBeenCalledOnce();
  });
  it.each([401, 403])("encerra observação em %s sem inventar leitura", async (status) => {
    fetchMock.mockResolvedValueOnce(Response.json({ erro: "Negado" }, { status }));
    iniciar(); intersecao(); await aguardar();
    intersecao(); await aguardar();
    expect(fetchMock).toHaveBeenCalledOnce();
    expect(disconnect).toHaveBeenCalled();
    expect(opcoes.aoErro.mock.calls[0][0]).toMatchObject({ status });
    expect(opcoes.aoConfirmar).not.toHaveBeenCalled();
  });
  it("não registra sem suporte a observação de visibilidade", async () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    iniciar(); await aguardar();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
