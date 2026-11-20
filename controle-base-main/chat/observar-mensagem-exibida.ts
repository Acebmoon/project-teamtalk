import type { LeituraRegistrada, MensagemParaLeitura } from "./contratos-leituras";
import { FalhaClienteLeituras, marcarMensagemExibida } from "./leituras-cliente";

export type OpcoesMensagemExibida = {
  usuarioId: string;
  conversaId: string;
  mensagem: MensagemParaLeitura;
  raiz?: Element | null;
  aoConfirmar: (leitura: LeituraRegistrada) => void;
  aoErro: (erro: Error) => void;
};

// O carregamento do histórico, GET de status e Realtime jamais chamam o POST.
// Exige área visível por 300 ms na conversa ativa, documento visível e em foco.
export function observarMensagemExibida(elemento: HTMLElement, opcoes: OpcoesMensagemExibida) {
  const { usuarioId, conversaId, mensagem, aoConfirmar, aoErro } = opcoes;
  if (mensagem.remetenteId === usuarioId || mensagem.conversaId !== conversaId) return () => {};
  const documento = elemento.ownerDocument;
  const janela = documento.defaultView;
  if (!janela || typeof IntersectionObserver === "undefined") return () => {};
  const abortar = new AbortController();
  let ativo = true;
  let visivel = false;
  let confirmado = false;
  let enviando = false;
  let temporizador: ReturnType<typeof setTimeout> | undefined;

  function podeRegistrar() {
    if (!ativo || confirmado || enviando || !visivel || !elemento.isConnected
      || documento.visibilityState !== "visible" || !documento.hasFocus()) return false;
    // IntersectionObserver mede geometria; visibility/opacity também precisam
    // ser verificadas, inclusive se a conversa foi escondida por um ancestral.
    for (let atual: Element | null = elemento; atual; atual = atual.parentElement) {
      const estilo = janela!.getComputedStyle(atual);
      if (estilo.display === "none" || estilo.visibility === "hidden" || estilo.visibility === "collapse"
        || estilo.opacity === "0") return false;
    }
    return true;
  }

  async function registrar() {
    temporizador = undefined;
    if (!podeRegistrar()) return;
    enviando = true;
    try {
      const leitura = await marcarMensagemExibida(conversaId, mensagem.id, abortar.signal);
      confirmado = true;
      if (ativo) aoConfirmar(leitura);
    } catch (erro) {
      if (ativo) {
        if (erro instanceof FalhaClienteLeituras && (erro.status === 401 || erro.status === 403)) encerrar();
        aoErro(erro instanceof Error ? erro : new Error("Falha ao registrar leitura."));
      }
    } finally { enviando = false; }
  }

  function reavaliar() {
    clearTimeout(temporizador);
    temporizador = undefined;
    if (podeRegistrar()) temporizador = setTimeout(() => { void registrar(); }, 300);
  }

  const observador = new IntersectionObserver((entradas) => {
    const entrada = entradas.find((item) => item.target === elemento);
    if (!entrada) return;
    // Uma mensagem maior que o viewport também pode ter parte efetivamente exibida.
    visivel = entrada.isIntersecting && entrada.intersectionRatio > 0;
    reavaliar();
  }, { root: opcoes.raiz ?? null, threshold: [0, 0.01, 0.5, 1] });
  observador.observe(elemento);
  documento.addEventListener("visibilitychange", reavaliar);
  janela.addEventListener("focus", reavaliar);
  janela.addEventListener("blur", reavaliar);
  janela.addEventListener("online", reavaliar);

  function encerrar() {
    ativo = false;
    clearTimeout(temporizador);
    abortar.abort();
    observador.disconnect();
    documento.removeEventListener("visibilitychange", reavaliar);
    janela!.removeEventListener("focus", reavaliar);
    janela!.removeEventListener("blur", reavaliar);
    janela!.removeEventListener("online", reavaliar);
  }
  return encerrar;
}
