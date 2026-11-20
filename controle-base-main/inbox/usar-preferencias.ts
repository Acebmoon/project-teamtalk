"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { criarClienteInbox } from "./cliente";
import { LIMITE_CONVERSAS_INBOX, PREFERENCIA_PADRAO, type OrganizacaoInbox, type PreferenciaInbox } from "./contratos";

type Estado = { chave: string; organizacao: OrganizacaoInbox; carregando: boolean; salvando: boolean; erro?: string };

export function usePreferenciasInbox(usuarioId: string, conversaIds: string[]) {
  const chave = JSON.stringify([usuarioId, ...[...new Set(conversaIds)].sort()]);
  const ids = useMemo(() => (JSON.parse(chave) as string[]).slice(1), [chave]);
  const cliente = useMemo(() => criarClienteInbox(usuarioId), [usuarioId]);
  const [tentativa, setTentativa] = useState(0);
  const [estado, setEstado] = useState<Estado>({ chave: "", organizacao: {}, carregando: true, salvando: false });
  const versao = useRef(0);
  const gravando = useRef(false);

  useEffect(() => {
    const atual = ++versao.current;
    const cancelamento = new AbortController();
    gravando.current = false;
    setEstado({ chave, organizacao: {}, carregando: true, salvando: false });
    async function carregar() {
      try {
        const organizacao: OrganizacaoInbox = {};
        // A lista de #99 é paginada. Cada consulta de preferências aceita até 50 IDs.
        for (let inicio = 0; inicio < ids.length; inicio += LIMITE_CONVERSAS_INBOX) {
          const resposta = await cliente.listar(ids.slice(inicio, inicio + LIMITE_CONVERSAS_INBOX), cancelamento.signal);
          for (const { conversaId, ...preferencia } of resposta.preferencias) organizacao[conversaId] = preferencia;
        }
        if (versao.current === atual) setEstado({ chave, organizacao, carregando: false, salvando: false });
      } catch {
        if (versao.current === atual) setEstado({
          chave, organizacao: {}, carregando: false, salvando: false,
          erro: "Não foi possível carregar sua organização. Tente novamente.",
        });
      }
    }
    void carregar();
    return () => { versao.current = atual + 1; cancelamento.abort(); };
  }, [chave, ids, cliente, tentativa]);

  const visivel = estado.chave === chave ? estado : { chave, organizacao: {}, carregando: true, salvando: false };

  async function aoAtualizarPreferencia(conversaId: string, parcial: Partial<PreferenciaInbox>) {
    if (gravando.current || visivel.carregando || visivel.erro || !ids.includes(conversaId))
      throw new Error("Aguarde a organização ficar disponível.");
    const atual = versao.current;
    gravando.current = true;
    setEstado((anterior) => ({ ...anterior, salvando: true, erro: undefined }));
    try {
      const resposta = await cliente.salvar([{
        conversaId, ...PREFERENCIA_PADRAO, ...visivel.organizacao[conversaId], ...parcial,
      }]);
      const { conversaId: id, ...preferencia } = resposta.preferencias[0];
      if (atual === versao.current) setEstado((anterior) => ({
        ...anterior, organizacao: { ...anterior.organizacao, [id]: preferencia }, salvando: false,
      }));
    } catch (erro) {
      if (atual === versao.current) setEstado({
        chave, organizacao: {}, carregando: false, salvando: false,
        erro: "Não foi possível salvar sua organização. Recarregue para tentar novamente.",
      });
      throw erro;
    } finally {
      if (atual === versao.current) gravando.current = false;
    }
  }

  return {
    preferenciasInbox: visivel.organizacao,
    carregandoPreferencias: visivel.carregando,
    salvandoPreferencias: visivel.salvando,
    erroPreferencias: visivel.erro,
    aoAtualizarPreferencia,
    aoRecarregarPreferencias: () => setTentativa((anterior) => anterior + 1),
  };
}
