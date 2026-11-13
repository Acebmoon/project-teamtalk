"use client";

import { FormEvent, useMemo, useState } from "react";

export type ConversaResumo = {
  id: string;
  titulo: string;
  subtitulo?: string;
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
};

type Props = {
  usuarioId: string;
  conversas: ConversaResumo[];
  mensagens: MensagemConversa[];
  conversaAtivaId?: string;
  carregando?: boolean;
  erro?: string;
  aoSelecionarConversa: (conversaId: string) => void;
  aoEnviarMensagem: (conversaId: string, conteudo: string) => Promise<void>;
};

function horario(valor?: string) {
  if (!valor) return "";
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(data);
}

function dataMensagem(valor: string) {
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return "";
  const hoje = new Date();
  if (data.toDateString() === hoje.toDateString()) return horario(valor);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(data);
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
}: Props) {
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const conversaAtiva = conversas.find((conversa) => conversa.id === conversaAtivaId);
  const mensagensAtivas = useMemo(
    () => mensagens.filter((mensagem) => mensagem.conversaId === conversaAtivaId),
    [mensagens, conversaAtivaId],
  );

  async function enviar(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const conteudo = texto.trim();
    if (!conversaAtivaId || !conteudo || enviando) return;
    setEnviando(true);
    try {
      await aoEnviarMensagem(conversaAtivaId, conteudo);
      setTexto("");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="chat-app" aria-label="TeamTalk - conversas">
      <aside className={`chat-sidebar ${conversaAtiva ? "chat-sidebar--mobile-hidden" : ""}`}>
        <header className="chat-sidebar__topo">
          <div>
            <span className="chat-eyebrow">COMUNICAÇÃO INTERNA</span>
            <h1>Conversas</h1>
          </div>
          <span className="chat-brand-mark" aria-hidden="true">T</span>
        </header>
        <div className="chat-search">
          <span aria-hidden="true">⌕</span>
          <input aria-label="Buscar conversas" placeholder="Buscar conversa" type="search" />
        </div>
        <div className="chat-lista" aria-label="Lista de conversas">
          {carregando && <p className="chat-empty">Carregando conversas…</p>}
          {!carregando && conversas.length === 0 && (
            <p className="chat-empty">Suas conversas aparecerão aqui.</p>
          )}
          {conversas.map((conversa) => (
            <button
              className={`chat-conversa ${conversa.id === conversaAtivaId ? "chat-conversa--ativa" : ""}`}
              key={conversa.id}
              onClick={() => aoSelecionarConversa(conversa.id)}
              type="button"
              aria-current={conversa.id === conversaAtivaId ? "true" : undefined}
            >
              <span className="chat-avatar" aria-hidden="true">{conversa.avatarTexto}</span>
              <span className="chat-conversa__texto">
                <span className="chat-conversa__linha">
                  <strong>{conversa.titulo}</strong>
                  <time>{conversa.horarioUltimaMensagem ?? ""}</time>
                </span>
                <span className="chat-conversa__linha">
                  <span className="chat-conversa__preview">{conversa.ultimaMensagem ?? conversa.subtitulo ?? "Inicie uma conversa"}</span>
                  {!!conversa.naoLidas && <span className="chat-nao-lidas">{conversa.naoLidas}</span>}
                </span>
              </span>
            </button>
          ))}
        </div>
      </aside>

      <section className={`chat-main ${conversaAtiva ? "chat-main--mobile-visible" : ""}`} aria-label="Mensagens da conversa">
        {conversaAtiva ? (
          <>
            <header className="chat-header">
              <button className="chat-voltar" type="button" onClick={() => aoSelecionarConversa("")} aria-label="Voltar para conversas">‹</button>
              <span className="chat-avatar chat-avatar--header" aria-hidden="true">{conversaAtiva.avatarTexto}</span>
              <div className="chat-header__identidade">
                <h2>{conversaAtiva.titulo}</h2>
                <span>{conversaAtiva.online ? "Disponível" : conversaAtiva.subtitulo ?? "Conversa"}</span>
              </div>
              <button className="chat-mais" type="button" aria-label="Mais opções" disabled>•••</button>
            </header>

            <div className="chat-historico" aria-live="polite" aria-relevant="additions text">
              {mensagensAtivas.length === 0 && !carregando && (
                <div className="chat-historico-vazio">
                  <span aria-hidden="true">✦</span>
                  <strong>Esta conversa está começando</strong>
                  <p>Envie uma mensagem para iniciar o diálogo.</p>
                </div>
              )}
              {mensagensAtivas.map((mensagem) => {
                const propria = mensagem.remetenteId === usuarioId;
                return (
                  <article className={`chat-mensagem ${propria ? "chat-mensagem--propria" : "chat-mensagem--recebida"}`} key={mensagem.id}>
                    {!propria && <span className="chat-mensagem__autor">{mensagem.remetenteNome}</span>}
                    <div className="chat-balao">
                      <p>{mensagem.conteudo}</p>
                      <footer>
                        <time dateTime={mensagem.criadaEm}>{horario(mensagem.criadaEm)}</time>
                        {propria && (
                          <span className={`chat-recibo chat-recibo--${mensagem.estado}`} aria-label={mensagem.estado === "lida" ? "Mensagem lida" : mensagem.estado === "enviada" ? "Mensagem enviada" : mensagem.estado === "falha" ? "Falha no envio" : "Enviando"}>
                            {mensagem.estado === "lida" ? "✓✓" : mensagem.estado === "enviada" ? "✓" : mensagem.estado === "falha" ? "!" : "…"}
                          </span>
                        )}
                      </footer>
                    </div>
                  </article>
                );
              })}
              {carregando && <p className="chat-empty">Carregando mensagens…</p>}
            </div>

            {erro && <p className="chat-erro" role="alert">{erro}</p>}
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
                {enviando ? "…" : "➤"}
              </button>
            </form>
          </>
        ) : (
          <div className="chat-boas-vindas">
            <span className="chat-boas-vindas__icone" aria-hidden="true">T</span>
            <h2>Suas conversas, em um só lugar.</h2>
            <p>Selecione uma conversa para visualizar as mensagens.</p>
          </div>
        )}
      </section>
    </main>
  );
}
