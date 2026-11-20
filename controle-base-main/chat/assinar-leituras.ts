import type { SupabaseClient } from "@supabase/supabase-js";
import type { StatusLeiturasConversa } from "./contratos-leituras";
import { FalhaClienteLeituras, listarLeituras } from "./leituras-cliente";
import { uuidLeituraValido, validarIdsLeituras } from "./validar-leituras";

type Opcoes = {
  conversaId: string;
  mensagemIds: readonly string[];
  aoAtualizar: (status: StatusLeiturasConversa) => void;
  aoErro: (erro: Error) => void;
};

// Uma assinatura por lote de até 50 IDs, atualizado quando a página muda (#101).
// A RLS SELECT de message_reads aplica can_access_message() em cada evento.
// O payload só invalida o snapshot: a API reaplica também avaliarSessao().
export function assinarLeituras(supabase: SupabaseClient, { conversaId, mensagemIds, aoAtualizar, aoErro }: Opcoes) {
  if (!uuidLeituraValido(conversaId)) throw new Error("Conversa inválida.");
  const ids = validarIdsLeituras(mensagemIds);
  const abortar = new AbortController();
  let ativo = true;
  let executando = false;
  let pendente = false;
  let encerramento: Promise<unknown> | undefined;

  async function sincronizar() {
    if (!ativo) return;
    pendente = true;
    if (executando) return;
    executando = true;
    try {
      while (ativo && pendente) {
        pendente = false;
        const status = await listarLeituras(conversaId, ids, abortar.signal);
        if (ativo) aoAtualizar(status);
      }
    } catch (erro) {
      if (ativo) {
        // Remove o canal mesmo se o consumidor falhar ao apresentar o erro.
        if (erro instanceof FalhaClienteLeituras && (erro.status === 401 || erro.status === 403))
          void encerrar();
        aoErro(erro instanceof Error ? erro : new Error("Falha ao sincronizar leituras."));
      }
    } finally { executando = false; }
  }

  const canal = supabase.channel(`leituras:${conversaId}:${crypto.randomUUID()}`)
    .on("postgres_changes", {
      event: "INSERT", schema: "public", table: "message_reads", filter: `message_id=in.(${ids.join(",")})`,
    }, (evento) => {
      if (ids.includes(evento.new.message_id)) void sincronizar();
    })
    .subscribe((estado) => {
      if (!ativo) return;
      if (estado === "SUBSCRIBED") void sincronizar();
      else if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT" || estado === "CLOSED")
        aoErro(new Error("Conexão de leituras interrompida. Aguarde a reconexão."));
    });

  function encerrar(): Promise<unknown> {
    ativo = false;
    abortar.abort();
    encerramento ??= supabase.removeChannel(canal);
    return encerramento;
  }
  return encerrar;
}
