"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode, Ref } from "react";
import { Icone } from "@design/icones/icone";
import { SeletorAnexoPdf } from "@design/componentes/seletor-anexo-pdf";
import "./conversas.css";

export type ConversaResumo = {
  id: string;
  titulo: string;
  subtitulo?: string;
  equipe?: string;
  ultimaMensagem?: string;
  horarioUltimaMensagem?: string;
  naoLidas?: number;
  avatarTexto: string;
  online?: boolean;
};

export type MensagemConversa = {
  id: string;
  conversaId: string;
  remetenteId: string;
  remetenteNome: string;
  conteudo: string;
  criadaEm: string;
  estado: "enviando" | "enviada" | "lida" | "falha";
  downloadUrl?: string;
  nomeArquivo?: string;
  leituras?: { usuarioId: string; lidaEm: string | null }[];
};

export type SituacaoInbox = "acompanhar" | "em-conversa" | "concluida";
export type PrioridadeInbox = "normal" | "alta" | "urgente";
export type PreferenciaInbox = {
  situacao: SituacaoInbox;
  prioridade: PrioridadeInbox;
  favorita: boolean;
};

const situacoes: ReadonlyArray<{ valor: SituacaoInbox; rotulo: string }> = [
  { valor: "acompanhar", rotulo: "A acompanhar" },
  { valor: "em-conversa", rotulo: "Em conversa" },
  { valor: "concluida", rotulo: "Concluídas" },
];
const prioridades: ReadonlyArray<{ valor: PrioridadeInbox; rotulo: string }> = [
  { valor: "normal", rotulo: "Normal" },
  { valor: "alta", rotulo: "Alta" },
  { valor: "urgente", rotulo: "Urgente" },
];
const preferenciaPadrao: PreferenciaInbox = {
  situacao: "em-conversa",
  prioridade: "normal",
  favorita: false,
};

export type PropsConversas = {
  usuarioId: string;
  conversas: ConversaResumo[];
  mensagens: MensagemConversa[];
  conversaAtivaId?: string;
  carregando?: boolean;
  erro?: string;
  preferenciasInbox: Record<string, PreferenciaInbox>;
  carregandoPreferencias?: boolean;
  salvandoPreferencias?: boolean;
  erroPreferencias?: string;
  aoAtualizarPreferencia: (conversaId: string, parcial: Partial<PreferenciaInbox>) => Promise<void>;
  aoRecarregarPreferencias: () => void;
  aoSelecionarConversa: (conversaId: string) => void;
  aoEnviarMensagem: (conversaId: string, conteudo: string) => Promise<void>;
  aoEnviarPdf?: (conversaId: string, arquivo: File) => Promise<void>;
  pdfMaxBytes?: number;
  carregandoMensagens?: boolean;
  maisConversas?: boolean;
  maisMensagens?: boolean;
  aoCarregarMaisConversas?: () => void;
  aoCarregarMaisMensagens?: () => void;
  aoRecarregar?: () => void;
  renderizarMensagem?: (mensagem: MensagemConversa) => ReactNode;
  acoesConta?: ReactNode;
};

function horario(valor?: string) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(data);
}

export function TelaConversas({
  usuarioId,
  conversas,
  mensagens,
  conversaAtivaId,
  carregando = false,
  erro,
  aoSelecionarConversa,
  aoEnviarMensagem,
  preferenciasInbox,
  carregandoPreferencias = false,
  salvandoPreferencias = false,
  erroPreferencias,
  aoAtualizarPreferencia,
  aoRecarregarPreferencias,
  aoEnviarPdf, pdfMaxBytes = 4000000, carregandoMensagens = carregando,
  maisConversas, maisMensagens, aoCarregarMaisConversas, aoCarregarMaisMensagens,
  aoRecarregar, renderizarMensagem, acoesConta,
}: PropsConversas) {
  const historicoRef = useRef<HTMLDivElement>(null);
  const [texto, setTexto] = useState("");
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [busca, setBusca] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erroEnvio, setErroEnvio] = useState("");
  const [area, setArea] = useState<"inbox" | "equipes" | "foco">("inbox");
  const [vista, setVista] = useState<"lista" | "quadro">("lista");
  const [filtro, setFiltro] = useState<"todas" | "prioridade" | "nao-lidas">("todas");
  const [tema, setTema] = useState<"escuro" | "claro">("claro");

  // O controle injeta apenas preferências confirmadas pelo servidor.
  const organizacao = preferenciasInbox;
  const [erroOrganizacao, setErroOrganizacao] = useState("");
  useEffect(() => { setErroEnvio(""); setErroOrganizacao(""); }, [usuarioId]);
  useEffect(() => { setTexto(""); setArquivo(null); setErroEnvio(""); }, [conversaAtivaId]);
  const bloqueandoPreferencias = carregandoPreferencias || salvandoPreferencias || !!erroPreferencias;
  const preferencia = (id: string): PreferenciaInbox => organizacao[id] ?? preferenciaPadrao;
  async function atualizarPreferencia(id: string, parcial: Partial<PreferenciaInbox>) {
    if (bloqueandoPreferencias) return;
    setErroOrganizacao("");
    try {
      await aoAtualizarPreferencia(id, parcial);
    } catch {
      setErroOrganizacao("Não foi possível salvar a organização. Tente novamente.");
    }
  }
  const conversaAtiva = conversas.find((conversa) => conversa.id === conversaAtivaId);
  const mensagensAtivas = useMemo(
    () => mensagens.filter((mensagem) => mensagem.conversaId === conversaAtivaId),
    [mensagens, conversaAtivaId],
  );
  const ultimaMensagemId = mensagensAtivas.at(-1)?.id;
  useEffect(() => {
    const elemento = historicoRef.current;
    if (elemento) elemento.scrollTop = elemento.scrollHeight;
  }, [conversaAtivaId, ultimaMensagemId]);
  const conversasFiltradas = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");
    return conversas.filter((conversa) => {
      const pref = organizacao[conversa.id] ?? preferenciaPadrao;
      if (area === "foco" && !pref.favorita && pref.prioridade === "normal") return false;
      if (filtro === "prioridade" && pref.prioridade === "normal") return false;
      if (filtro === "nao-lidas" && !conversa.naoLidas) return false;
      const textoPesquisa = [
        conversa.titulo, conversa.subtitulo, conversa.ultimaMensagem, conversa.equipe,
      ].filter(Boolean).join(" ").toLocaleLowerCase("pt-BR");
      return !termo || textoPesquisa.includes(termo);
    });
  }, [conversas, busca, organizacao, area, filtro]);

  const grupos = useMemo(() => {
    if (area === "equipes" && vista === "lista") {
      const mapa = new Map<string, ConversaResumo[]>();
      for (const conversa of conversasFiltradas) {
        const titulo = conversa.equipe?.trim() || "Sem equipe definida";
        mapa.set(titulo, [...(mapa.get(titulo) ?? []), conversa]);
      }
      return [...mapa].sort(([a], [b]) => a.localeCompare(b, "pt-BR"))
        .map(([titulo, itens]) => ({ titulo, itens }));
    }
    return situacoes.map(({ valor, rotulo }) => ({
      titulo: rotulo,
      itens: conversasFiltradas.filter((conversa) => (
        (organizacao[conversa.id] ?? preferenciaPadrao).situacao === valor
      )),
    }));
  }, [conversasFiltradas, organizacao, area, vista]);

  const totalNaoLidas = conversas.reduce((soma, conversa) => soma + (conversa.naoLidas ?? 0), 0);

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const conteudo = texto.trim();
    if (!conversaAtivaId || !conteudo || enviando) return;
    setEnviando(true);
    setErroEnvio("");
    try {
      await aoEnviarMensagem(conversaAtivaId, conteudo);
      setTexto("");
    } catch {
      setErroEnvio("Não foi possível enviar. Tente novamente.");
    } finally {
      setEnviando(false);
    }
  }

  async function enviarArquivo() {
    if (!arquivo || !conversaAtivaId || !aoEnviarPdf || enviando) return;
    setEnviando(true); setErroEnvio("");
    try { await aoEnviarPdf(conversaAtivaId, arquivo); setArquivo(null); }
    catch { setErroEnvio("Não foi possível enviar o PDF. Tente novamente."); }
    finally { setEnviando(false); }
  }

  function renderConversa(conversa: ConversaResumo) {
    const pref = preferencia(conversa.id);
    return (
      <article className="workspace-item" key={conversa.id}>
        <button
          type="button"
          className={"workspace-item__abrir" + (conversa.id === conversaAtivaId ? " workspace-item__abrir--ativa" : "")}
          onClick={() => aoSelecionarConversa(conversa.id)}
          aria-label={"Abrir " + conversa.titulo}
          aria-current={conversa.id === conversaAtivaId ? "true" : undefined}
        >
          <span className="chat-avatar" aria-hidden="true">{conversa.avatarTexto}</span>
          <span className="workspace-item__texto">
            <span className="workspace-item__linha">
              <strong>{conversa.titulo}</strong>
              <time>{conversa.horarioUltimaMensagem ?? ""}</time>
            </span>
            <span className="workspace-item__resumo">
              {conversa.ultimaMensagem ?? conversa.subtitulo ?? "Sem mensagens"}
            </span>
            <span className="workspace-item__metadados">
              <span className={"workspace-prioridade workspace-prioridade--" + pref.prioridade}>
                {prioridades.find((p) => p.valor === pref.prioridade)?.rotulo}
              </span>
              {conversa.equipe && <span>{conversa.equipe}</span>}
              {!!conversa.naoLidas && <span className="workspace-nao-lidas">{conversa.naoLidas} não lidas</span>}
            </span>
          </span>
        </button>
        <div className="workspace-item__acoes">
          <label>
            <span className="sr-only">Prioridade de {conversa.titulo}</span>
            <select
              aria-label={"Prioridade de " + conversa.titulo}
              disabled={bloqueandoPreferencias}
              value={pref.prioridade}
              onChange={(e) => atualizarPreferencia(conversa.id, { prioridade: e.target.value as PrioridadeInbox })}
            >
              {prioridades.map((p) => <option value={p.valor} key={p.valor}>{p.rotulo}</option>)}
            </select>
          </label>
          <label>
            <span className="sr-only">Situação de {conversa.titulo}</span>
            <select
              aria-label={"Situação de " + conversa.titulo}
              disabled={bloqueandoPreferencias}
              value={pref.situacao}
              onChange={(e) => atualizarPreferencia(conversa.id, { situacao: e.target.value as SituacaoInbox })}
            >
              {situacoes.map((s) => <option value={s.valor} key={s.valor}>{s.rotulo}</option>)}
            </select>
          </label>
          <button
            type="button"
            className={"workspace-favorito" + (pref.favorita ? " workspace-favorito--ativo" : "")}
            disabled={bloqueandoPreferencias}
            aria-pressed={pref.favorita}
            aria-label={(pref.favorita ? "Remover do foco: " : "Adicionar ao foco: ") + conversa.titulo}
            onClick={() => atualizarPreferencia(conversa.id, { favorita: !pref.favorita })}
          >{pref.favorita ? "★" : "☆"}</button>
        </div>
      </article>
    );
  }

  return (
    <main className={"chat-app workspace workspace--" + tema} aria-label="TeamTalk - workspace de comunicação">
      <aside className={"chat-sidebar workspace-sidebar" + (conversaAtiva ? " chat-sidebar--mobile-hidden" : "")}>
        <header className="workspace-marca">
          <span className="chat-brand-mark" aria-hidden="true">T</span>
          <span><strong>TeamTalk</strong><small>Comunicação interna</small></span>
          <button type="button" className="workspace-tema" onClick={() => setTema(tema === "escuro" ? "claro" : "escuro")} aria-label={"Ativar tema " + (tema === "escuro" ? "claro" : "escuro")}>
            {tema === "escuro" ? "☼" : "☾"}
          </button>
        </header>
        {acoesConta && <div className="workspace-conta">{acoesConta}</div>}
        <div className="workspace-titulo">
          <span className="chat-eyebrow">WORKSPACE</span>
          <div className="workspace-titulo__linha">
            <h1>{area === "equipes" ? "Equipes" : area === "foco" ? "Em foco" : "Caixa de entrada"}</h1>
            <span className="workspace-contador">{totalNaoLidas} não lidas</span>
          </div>
          <p>{area === "equipes" ? "Comunicação por departamento." : area === "foco" ? "Suas conversas prioritárias." : "O que merece atenção, organizado."}</p>
        </div>
        <div className="chat-search workspace-busca">
          <Icone nome="busca" />
          <input aria-label="Buscar conversas ou equipes" placeholder="Buscar conversa ou equipe" type="search" value={busca} onChange={(e) => setBusca(e.target.value)} />
        </div>
        <div className="workspace-ferramentas">
          <div role="group" aria-label="Modo de visualização">
            <button type="button" className={vista === "lista" ? "ativo" : ""} aria-pressed={vista === "lista"} onClick={() => setVista("lista")}>☰ Lista</button>
            <button type="button" className={vista === "quadro" ? "ativo" : ""} aria-pressed={vista === "quadro"} onClick={() => setVista("quadro")}>▦ Quadro</button>
          </div>
          <div role="group" aria-label="Filtro de conversas">
            <button type="button" className={filtro === "todas" ? "ativo" : ""} aria-pressed={filtro === "todas"} onClick={() => setFiltro("todas")}>Todas</button>
            <button type="button" className={filtro === "prioridade" ? "ativo" : ""} aria-pressed={filtro === "prioridade"} onClick={() => setFiltro("prioridade")}>Prioridade</button>
            <button type="button" className={filtro === "nao-lidas" ? "ativo" : ""} aria-pressed={filtro === "nao-lidas"} onClick={() => setFiltro("nao-lidas")}>Não lidas</button>
          </div>
        </div>
        {carregandoPreferencias && <p role="status">Carregando sua organização…</p>}
        {salvandoPreferencias && <p role="status">Salvando organização…</p>}
        {(erroPreferencias || erroOrganizacao) && (
          <div role="alert">
            <p>{erroPreferencias || erroOrganizacao}</p>
            <button type="button" onClick={() => { setErroOrganizacao(""); aoRecarregarPreferencias(); }}>
              Tentar novamente
            </button>
          </div>
        )}
        <div className={"chat-lista workspace-lista" + (vista === "quadro" ? " workspace-lista--quadro" : "")} aria-label="Conversas organizadas">
          {carregando && <p className="chat-empty">Carregando conversas…</p>}
          {!carregando && conversas.length === 0 && <p className="chat-empty"><Icone nome="lista-vazia" />Suas conversas aparecerão aqui.</p>}
          {!carregando && conversas.length > 0 && conversasFiltradas.length === 0 && <p className="chat-empty">Nenhuma conversa neste filtro.</p>}
          {!carregando && grupos.filter((grupo) => grupo.itens.length > 0).map((grupo) => (
            <section className="workspace-grupo" key={grupo.titulo} aria-label={grupo.titulo}>
              <h2 className="workspace-grupo__titulo">{grupo.titulo} <small>{grupo.itens.length}</small></h2>
              {grupo.itens.map(renderConversa)}
            </section>
          ))}
        </div>
        {maisConversas && <button type="button" disabled={carregando} onClick={aoCarregarMaisConversas}>Carregar mais conversas</button>}
        {erro && !conversaAtiva && <div className="chat-erro" role="alert"><Icone nome="erro" />{erro}<button type="button" onClick={aoRecarregar}>Tentar novamente</button></div>}
        <nav className="workspace-nav" aria-label="Seções do workspace">
          <button type="button" className={area === "inbox" ? "ativo" : ""} aria-current={area === "inbox" ? "page" : undefined} onClick={() => setArea("inbox")}><Icone nome="inbox" />Inbox</button>
          <button type="button" className={area === "equipes" ? "ativo" : ""} aria-current={area === "equipes" ? "page" : undefined} onClick={() => setArea("equipes")}><Icone nome="equipes" />Equipes</button>
          <button type="button" className={area === "foco" ? "ativo" : ""} aria-current={area === "foco" ? "page" : undefined} onClick={() => setArea("foco")}><span aria-hidden="true">◎</span>Em foco</button>
        </nav>
      </aside>

      <section className={`chat-main ${conversaAtiva ? "chat-main--mobile-visible" : ""}`} aria-label="Mensagens da conversa">
        {conversaAtiva ? (
          <>
            <header className="chat-header">
              <button className="chat-voltar" type="button" onClick={() => aoSelecionarConversa("")} aria-label="Voltar para conversas"><Icone nome="voltar" /></button>
              <span className="chat-avatar chat-avatar--header" aria-hidden="true">{conversaAtiva.avatarTexto}</span>
              <div className="chat-header__identidade">
                <h2>{conversaAtiva.titulo}</h2>
                <span>{conversaAtiva.online ? "Disponível" : conversaAtiva.subtitulo ?? "Conversa"}</span>
              </div>

            </header>

            <div ref={historicoRef} className="chat-historico" aria-live="polite" aria-relevant="additions text">
              {mensagensAtivas.length === 0 && !carregandoMensagens && (
                <div className="chat-historico-vazio">
                  <span aria-hidden="true">✦</span>
                  <strong>Esta conversa está começando</strong>
                  <p>Envie uma mensagem para iniciar o diálogo.</p>
                </div>
              )}
              {maisMensagens && <button type="button" disabled={carregandoMensagens} onClick={aoCarregarMaisMensagens}>Carregar mensagens anteriores</button>}
              {mensagensAtivas.map((mensagem) => renderizarMensagem
                ? renderizarMensagem(mensagem)
                : <BalaoMensagem key={mensagem.id} mensagem={mensagem} usuarioId={usuarioId} />)}
              {carregandoMensagens && <p className="chat-empty">Carregando mensagens…</p>}
            </div>

            {(erro || erroEnvio) && <div className="chat-erro" role="alert"><Icone nome="erro" />{erroEnvio || erro}{aoRecarregar && <button type="button" onClick={aoRecarregar}>Tentar novamente</button>}</div>}
            {aoEnviarPdf && <div className="chat-anexo">
              <SeletorAnexoPdf key={conversaAtivaId} arquivo={arquivo} limiteMaximoBytes={pdfMaxBytes} aoAlterarArquivo={setArquivo} desabilitado={enviando} />
              {arquivo && <button type="button" disabled={enviando} onClick={enviarArquivo}><Icone nome="enviar" />Enviar PDF</button>}
            </div>}
            <form className="chat-compositor" onSubmit={enviar}>
              <label className="chat-compositor__campo">
                <span className="sr-only">Escreva uma mensagem</span>
                <input
                  value={texto}
                  onChange={(evento) => setTexto(evento.target.value)}
                  placeholder="Digite sua mensagem…"
                  autoComplete="off"
                  maxLength={4000}
                  aria-label="Digite sua mensagem"
                />
              </label>
              <button className="chat-enviar" type="submit" disabled={!texto.trim() || enviando} aria-label="Enviar mensagem">
                <Icone nome={enviando ? "aguardando" : "enviar"} />
              </button>
            </form>
          </>
        ) : (
          <div className="chat-boas-vindas">
            <span className="chat-boas-vindas__icone" aria-hidden="true">T</span>
            <h2>Sua comunicação em um workspace.</h2>
            <p>Selecione uma conversa na Inbox, Equipes ou Em foco.</p>
          </div>
        )}
      </section>
    </main>
  );
}


/** Balão puro: o controle fornece o ref que observa a exibição efetiva. */
export function BalaoMensagem({ mensagem, usuarioId, referencia }: {
  mensagem: MensagemConversa; usuarioId: string; referencia?: Ref<HTMLElement>;
}) {
  const propria = mensagem.remetenteId === usuarioId;
  return <article ref={referencia} className={`chat-mensagem ${propria ? "chat-mensagem--propria" : "chat-mensagem--recebida"}`}>
    {!propria && <span className="chat-mensagem__autor">{mensagem.remetenteNome}</span>}
    <div className="chat-balao">
      {mensagem.downloadUrl
        ? <a className="chat-download" href={mensagem.downloadUrl}><Icone nome="arquivo-pdf" />{mensagem.nomeArquivo || "Baixar PDF"}</a>
        : <p>{mensagem.conteudo}</p>}
      <footer>
        <time dateTime={mensagem.criadaEm}>{horario(mensagem.criadaEm)}</time>
        {propria && <span className={`chat-recibo chat-recibo--${mensagem.estado}`} aria-label={mensagem.estado === "lida" ? "Mensagem lida" : mensagem.estado === "enviada" ? "Mensagem enviada" : mensagem.estado === "falha" ? "Falha no envio" : "Enviando"}>
          <Icone nome={mensagem.estado === "enviando" ? "aguardando" : mensagem.estado} width={16} height={16} />
        </span>}
      </footer>
      {propria && !!mensagem.leituras?.length && <details className="chat-leituras"><summary>Leituras por destinatário</summary><ul>
        {mensagem.leituras.map((leitura) => <li key={leitura.usuarioId}>Participante {leitura.usuarioId.slice(0, 8)}: {leitura.lidaEm ? <>lida às <time dateTime={leitura.lidaEm}>{horario(leitura.lidaEm)}</time></> : "não lida"}</li>)}
      </ul></details>}
    </div>
  </article>;
}
