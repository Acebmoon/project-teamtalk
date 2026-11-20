"use client";

import { useEffect, useState } from "react";
import { observarMensagemExibida, type OpcoesMensagemExibida } from "./observar-mensagem-exibida";

// O componente visual recebe este ref por props; não precisa conhecer Supabase.
// Desmontar o balão ou trocar a conversa cancela observação e confirmação pendente.
export function useMensagemExibida(opcoes: OpcoesMensagemExibida) {
  const [elemento, definirElemento] = useState<HTMLElement | null>(null);
  const { usuarioId, conversaId, mensagem: { id, conversaId: conversaMensagem, remetenteId }, raiz, aoConfirmar, aoErro } = opcoes;
  useEffect(() => {
    if (!elemento) return;
    return observarMensagemExibida(elemento, {
      usuarioId, conversaId, mensagem: { id, conversaId: conversaMensagem, remetenteId }, raiz, aoConfirmar, aoErro,
    });
  }, [elemento, usuarioId, conversaId, id, conversaMensagem, remetenteId, raiz, aoConfirmar, aoErro]);
  return definirElemento;
}
