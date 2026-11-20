"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ConversasInbox } from "@controle/inbox/conversas";
import { BalaoMensagem, type MensagemConversa } from "@design/telas/conversas";
import { criarNavegador } from "../supabase/navegador";
import type { ConversaListada, PaginaConversas } from "./contratos";
import type { MensagemChat, PaginaMensagens } from "./contratos-mensagens";
import type { StatusLeituraMensagem } from "./contratos-leituras";
import { adaptarConversaResumo } from "./adaptar-conversa";
import { adaptarMensagemConversa } from "./adaptar-mensagem";
import { adaptarEstadoLeitura } from "./adaptar-leitura";
import { listarMensagens, enviarMensagemTexto } from "./mensagens-cliente";
import { listarLeituras } from "./leituras-cliente";
import { assinarMensagens } from "./assinar-mensagens";
import { assinarLeituras } from "./assinar-leituras";
import { reconciliarMensagens } from "./reconciliar-mensagens";
import { useMensagemExibida } from "./use-mensagem-exibida";
import { listarConversas, enviarPdf, statusFalha } from "./workspace-cliente";

type Props = { usuarioId: string; nome: string; ehAdmin: boolean; pdfMaxBytes: number; sair: () => Promise<void> };
type Historico = { conversaId: string; mensagens: MensagemChat[]; cursor: string | null; carregando: boolean };

function MensagemMonitorada({ mensagem, usuarioId, aoConfirmar, aoErro }: {
  mensagem: MensagemConversa; usuarioId: string; aoConfirmar: () => void; aoErro: (erro: Error) => void;
}) {
  const referencia = useMensagemExibida({ usuarioId, conversaId: mensagem.conversaId, mensagem, aoConfirmar, aoErro });
  return <BalaoMensagem mensagem={mensagem} usuarioId={usuarioId} referencia={referencia} />;
}

/** Compõe a apresentação com APIs autenticadas; todo acesso Supabase fica no controle. */
export function WorkspaceChat({ usuarioId, nome, ehAdmin, pdfMaxBytes, sair }: Props) {
  const router = useRouter();
  const supabase = useMemo(() => criarNavegador(), []);
  const [lista, setLista] = useState<PaginaConversas>();
  const [carregando, setCarregando] = useState(true);
  const [conversaId, setConversaId] = useState("");
  const [historico, setHistorico] = useState<Historico>({ conversaId: "", mensagens: [], cursor: null, carregando: false });
  const [pendentes, setPendentes] = useState<MensagemConversa[]>([]);
  const [leituras, setLeituras] = useState<Record<string, StatusLeituraMensagem>>({});
  const [erro, setErro] = useState("");
  const [tentativa, setTentativa] = useState(0);
  const selecao = useRef("");
  const montado = useRef(true);
  const requisicaoLista = useRef(0);

  const falhar = useCallback((falha: unknown) => {
    if (!montado.current) return;
    const status = statusFalha(falha);
    if (status === 401 || status === 403) {
      // Revogação/expiração elimina também o conteúdo já carregado no componente.
      selecao.current = "";
      setLista(undefined); setHistorico({ conversaId: "", mensagens: [], cursor: null, carregando: false });
      setPendentes([]); setLeituras({}); setConversaId("");
      router.replace(status === 401 ? "/login?erro=sessao" : "/login?erro=acesso");
    }
    setErro(falha instanceof Error ? falha.message : "Não foi possível atualizar o workspace.");
  }, [router]);

  const atualizarLista = useCallback(async () => {
    const atual = ++requisicaoLista.current;
    try {
      const pagina = await listarConversas();
      if (pagina.usuarioId !== usuarioId) throw new Error("A sessão mudou. Entre novamente.");
      if (montado.current && atual === requisicaoLista.current) {
        setLista(pagina); setCarregando(false);
        // Não manter uma conversa revogada visível enquanto outra página é consultada.
        if (selecao.current && !pagina.conversas.some((c) => c.id === selecao.current)) {
          const id = selecao.current;
          const verificacao = await listarMensagens(id, { limite: 1 });
          if (verificacao.usuarioId !== usuarioId) throw new Error("A sessão mudou. Entre novamente.");
        }
      }
    } catch (falha) {
      if (montado.current && atual === requisicaoLista.current) { setCarregando(false); falhar(falha); }
    }
  }, [usuarioId, falhar]);

  useEffect(() => {
    montado.current = true;
    void atualizarLista();
    const canal = supabase.channel(`inbox:${usuarioId}:${crypto.randomUUID()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages" }, () => { void atualizarLista(); })
      .subscribe();
    const atualizar = () => { if (document.visibilityState === "visible") void atualizarLista(); };
    const intervalo = setInterval(atualizar, 30_000);
    window.addEventListener("focus", atualizar); window.addEventListener("online", atualizar);
    return () => {
      montado.current = false; clearInterval(intervalo);
      window.removeEventListener("focus", atualizar); window.removeEventListener("online", atualizar);
      void supabase.removeChannel(canal);
    };
  }, [supabase, usuarioId, atualizarLista]);

  useEffect(() => {
    if (!conversaId) return;
    const abortar = new AbortController();
    let ativo = true;
    setHistorico({ conversaId, mensagens: [], cursor: null, carregando: true });
    setLeituras({}); setPendentes([]); setErro("");
    function receber(pagina: PaginaMensagens) {
      if (!ativo) return;
      if (pagina.usuarioId !== usuarioId || pagina.conversaId !== conversaId) {
        falhar(new Error("Resposta incompatível com a sessão atual.")); return;
      }
      setHistorico((anterior) => ({ conversaId,
        mensagens: reconciliarMensagens(anterior.conversaId === conversaId ? anterior.mensagens : [], pagina.mensagens),
        cursor: anterior.conversaId === conversaId && anterior.mensagens.length ? anterior.cursor : pagina.paginacao.proximoCursor,
        carregando: false,
      }));
    }
    const carregar = () => { void listarMensagens(conversaId, { limite: 50, signal: abortar.signal }).then(receber).catch((e) => {
      if (ativo) { setHistorico((h) => ({ ...h, carregando: false })); falhar(e); }
    }); };
    carregar();
    const encerrar = assinarMensagens(supabase, { conversaId, aoAtualizar: receber, aoErro: (e) => { if (ativo) falhar(e); } });
    const intervalo = setInterval(carregar, 30_000);
    window.addEventListener("focus", carregar); window.addEventListener("online", carregar);
    return () => {
      ativo = false; abortar.abort(); clearInterval(intervalo);
      window.removeEventListener("focus", carregar); window.removeEventListener("online", carregar);
      void encerrar();
    };
  }, [conversaId, usuarioId, supabase, falhar, tentativa]);

  const mensagens = historico.conversaId === conversaId ? historico.mensagens : [];
  const chaveIds = JSON.stringify(mensagens.map((m) => m.id).sort());
  useEffect(() => {
    if (!conversaId) return;
    const ids = JSON.parse(chaveIds) as string[];
    const abortar = new AbortController();
    let ativo = true;
    const encerramentos: (() => Promise<unknown>)[] = [];
    for (let inicio = 0; inicio < ids.length; inicio += 50) {
      const lote = ids.slice(inicio, inicio + 50);
      const receber = (status: Awaited<ReturnType<typeof listarLeituras>>) => {
        if (!ativo || status.usuarioId !== usuarioId || status.conversaId !== conversaId) return;
        setLeituras((anteriores) => ({ ...anteriores, ...Object.fromEntries(status.mensagens.map((m) => [m.mensagemId, m])) }));
      };
      void listarLeituras(conversaId, lote, abortar.signal).then(receber).catch((e) => { if (ativo) falhar(e); });
      encerramentos.push(assinarLeituras(supabase, { conversaId, mensagemIds: lote, aoAtualizar: receber, aoErro: (e) => { if (ativo) falhar(e); } }));
    }
    return () => { ativo = false; abortar.abort(); encerramentos.forEach((encerrar) => { void encerrar(); }); };
  }, [chaveIds, conversaId, usuarioId, supabase, falhar]);

  const confirmarLeitura = useCallback(() => { void atualizarLista(); }, [atualizarLista]);
  const resumoAtivo = lista?.conversas.find((c) => c.id === conversaId);
  const resumoRetido = useRef<ConversaListada | undefined>(undefined);
  if (resumoAtivo) resumoRetido.current = resumoAtivo;
  const conversas = lista?.conversas ?? [];
  const listaVisivel = conversaId && !resumoAtivo && resumoRetido.current?.id === conversaId
    ? [...conversas, resumoRetido.current] : conversas;

  function selecionar(id: string) {
    selecao.current = id; setConversaId(id); setPendentes([]); setLeituras({}); setErro("");
  }

  async function enviar(id: string, conteudo: string | File) {
    const temporaria: MensagemConversa = { id: `pendente-${crypto.randomUUID()}`, conversaId: id, remetenteId: usuarioId,
      remetenteNome: nome, conteudo: typeof conteudo === "string" ? conteudo : `PDF: ${conteudo.name}`,
      criadaEm: new Date().toISOString(), estado: "enviando" };
    setPendentes([temporaria]);
    try {
      const resultado = typeof conteudo === "string" ? await enviarMensagemTexto(id, conteudo) : await enviarPdf(id, conteudo);
      if (resultado.usuarioId !== usuarioId) throw new Error("A sessão mudou. Entre novamente.");
      if (montado.current && selecao.current === id) {
        setHistorico((h) => ({ ...h, mensagens: reconciliarMensagens(h.mensagens, [resultado.mensagem]) }));
        setPendentes([]); setErro("");
      }
      void atualizarLista();
    } catch (falha) {
      if (montado.current && selecao.current === id) setPendentes([{ ...temporaria, estado: "falha" }]);
      falhar(falha); throw falha;
    }
  }

  async function maisConversas() {
    if (!lista?.paginacao.proximoCursor || carregando) return;
    setCarregando(true);
    const atual = ++requisicaoLista.current;
    try {
      const pagina = await listarConversas(lista.paginacao.proximoCursor);
      if (pagina.usuarioId !== usuarioId) throw new Error("A sessão mudou. Entre novamente.");
      if (montado.current && atual === requisicaoLista.current) setLista((anterior) => ({ ...pagina,
        conversas: [...new Map([...(anterior?.conversas ?? []), ...pagina.conversas].map((c) => [c.id, c])).values()],
      }));
    } catch (e) { falhar(e); } finally { if (montado.current) setCarregando(false); }
  }

  async function maisMensagens() {
    if (!historico.cursor || historico.carregando) return;
    const id = conversaId;
    setHistorico((h) => ({ ...h, carregando: true }));
    try {
      const pagina = await listarMensagens(id, { limite: 50, cursor: historico.cursor });
      if (pagina.usuarioId !== usuarioId) throw new Error("A sessão mudou. Entre novamente.");
      if (montado.current && selecao.current === id) setHistorico((h) => ({ ...h,
        mensagens: reconciliarMensagens(h.mensagens, pagina.mensagens), cursor: pagina.paginacao.proximoCursor, carregando: false,
      }));
    } catch (e) {
      if (selecao.current === id) { setHistorico((h) => ({ ...h, carregando: false })); falhar(e); }
    }
  }

  const visuais: MensagemConversa[] = mensagens.map((mensagem) => {
    const status = leituras[mensagem.id];
    return { ...adaptarEstadoLeitura(adaptarMensagemConversa(mensagem, mensagem.remetenteId === usuarioId ? nome : "Participante"), status),
      ...(mensagem.tipo === "pdf" ? { downloadUrl: `/api/conversas/${mensagem.conversaId}/anexos/${mensagem.id}`, nomeArquivo: mensagem.nomeArquivo } : {}),
      leituras: status?.destinatarios,
    };
  });

  return <ConversasInbox usuarioId={usuarioId} conversas={listaVisivel.map((c) => adaptarConversaResumo(c))}
    mensagens={[...visuais, ...pendentes]} conversaAtivaId={conversaId} carregando={carregando}
    carregandoMensagens={historico.conversaId === conversaId && historico.carregando} erro={erro}
    aoSelecionarConversa={selecionar} aoEnviarMensagem={(id, texto) => enviar(id, texto)}
    aoEnviarPdf={(id, arquivo) => enviar(id, arquivo)} pdfMaxBytes={pdfMaxBytes}
    maisConversas={!!lista?.paginacao.proximoCursor} aoCarregarMaisConversas={maisConversas}
    maisMensagens={!!historico.cursor} aoCarregarMaisMensagens={maisMensagens}
    aoRecarregar={() => { setErro(""); void atualizarLista(); setTentativa((t) => t + 1); }}
    acoesConta={<><span>{nome}</span>{ehAdmin && <a href="/admin">Admin TI</a>}<form action={sair}><button type="submit">Sair</button></form></>}
    renderizarMensagem={(mensagem) => mensagem.id.startsWith("pendente-")
      ? <BalaoMensagem key={mensagem.id} mensagem={mensagem} usuarioId={usuarioId} />
      : <MensagemMonitorada key={mensagem.id} mensagem={mensagem} usuarioId={usuarioId} aoConfirmar={confirmarLeitura} aoErro={falhar} />}
  />;
}
