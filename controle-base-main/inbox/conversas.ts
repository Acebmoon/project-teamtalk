"use client";

import { createElement } from "react";
import { TelaConversas, type PropsConversas } from "@design/telas/conversas";
import { usePreferenciasInbox } from "./usar-preferencias";

export type PropsInboxPersistida = Omit<PropsConversas,
  "preferenciasInbox" | "carregandoPreferencias" | "salvandoPreferencias" | "erroPreferencias"
  | "aoAtualizarPreferencia" | "aoRecarregarPreferencias"
>;

function InboxDoUsuario(props: PropsInboxPersistida) {
  const organizacao = usePreferenciasInbox(props.usuarioId, props.conversas.map((conversa) => conversa.id));
  return createElement(TelaConversas, { ...props, ...organizacao });
}

// A troca da conta remonta a tela e elimina todo o estado visual anterior.
// O adaptador de chat continua responsável por conversas/mensagens/Realtime.
export function ConversasInbox(props: PropsInboxPersistida) {
  return createElement(InboxDoUsuario, { ...props, key: props.usuarioId });
}
