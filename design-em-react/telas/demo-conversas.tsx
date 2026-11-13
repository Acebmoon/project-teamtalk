"use client";

import { useState } from "react";
import { TelaConversas } from "./conversas";
import type { ConversaResumo, MensagemConversa } from "./conversas";

const iniciais: ConversaResumo[] = [
  { id: "diretoria", titulo: "Diretoria (demonstração)", subtitulo: "Conversa fictícia", avatarTexto: "DI", ultimaMensagem: "Vamos revisar a interface?", naoLidas: 1, horarioUltimaMensagem: "09:30" },
  { id: "equipe", titulo: "Equipe de Produto (demonstração)", subtitulo: "Conversa fictícia", avatarTexto: "EP", ultimaMensagem: "Documentação pronta para revisão.", naoLidas: 0, horarioUltimaMensagem: "09:12" },
];
const exemplos: MensagemConversa[] = [
  { id: "exemplo-1", conversaId: "diretoria", remetenteId: "exemplo-outro", remetenteNome: "Colega fictício", conteudo: "Bem-vindo à demonstração do TeamTalk. Estas mensagens não vêm do servidor.", criadaEm: "2026-11-13T09:20:00-03:00", estado: "lida" },
  { id: "exemplo-2", conversaId: "diretoria", remetenteId: "exemplo-outro", remetenteNome: "Colega fictício", conteudo: "Vamos revisar a interface?", criadaEm: "2026-11-13T09:30:00-03:00", estado: "enviada" },
  { id: "exemplo-3", conversaId: "equipe", remetenteId: "exemplo-outro", remetenteNome: "Colega fictício", conteudo: "Documentação pronta para revisão.", criadaEm: "2026-11-13T09:12:00-03:00", estado: "enviada" },
];

export function TelaDemoConversas() {
  const [conversas, setConversas] = useState(iniciais);
  const [mensagens, setMensagens] = useState(exemplos);
  const [conversaAtivaId, setConversaAtivaId] = useState<string | undefined>();
  const aoSelecionarConversa = (id: string) => {
    setConversaAtivaId(id || undefined);
    setConversas((lista) => lista.map((conversa) =>
      conversa.id === id ? { ...conversa, naoLidas: 0 } : conversa
    ));
  };
  const aoEnviarMensagem = async (conversaId: string, conteudo: string) => {
    const agora = new Date();
    setMensagens((lista) => [...lista, {
      id: `exemplo-${agora.getTime()}`, conversaId, remetenteId: "demo",
      remetenteNome: "Você", conteudo, criadaEm: agora.toISOString(),
      estado: "enviada",
    }]);
    setConversas((lista) => lista.map((conversa) => conversa.id === conversaId ?
      { ...conversa, ultimaMensagem: conteudo,
        horarioUltimaMensagem: new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit" }).format(agora) } :
      conversa
    ));
  };
  return (
    <div className="demo-teamtalk">
      <div className="demo-teamtalk-aviso" role="note">
        Modo demonstração · dados fictícios · não envia mensagens reais
      </div>
      <TelaConversas
        usuarioId="demo"
        conversas={conversas}
        mensagens={mensagens}
        conversaAtivaId={conversaAtivaId}
        aoSelecionarConversa={aoSelecionarConversa}
        aoEnviarMensagem={aoEnviarMensagem}
      />
    </div>
  );
}
