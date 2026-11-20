import type { SupabaseClient } from "@supabase/supabase-js";
import type { PaginaMensagens } from "./contratos-mensagens";
import { FalhaClienteMensagens, listarMensagens } from "./mensagens-cliente";
import { uuidValido } from "./validar-mensagens";

type Opcoes = {
  conversaId: string;
  aoAtualizar: (pagina: PaginaMensagens) => void;
  aoErro: (erro: Error) => void;
};

// Realtime sinaliza a mudança; o conteúdo vem da API para revalidar também
// a duração da sessão da aplicação. A RLS continua protegendo cada evento.
export function assinarMensagens(supabase: SupabaseClient, { conversaId, aoAtualizar, aoErro }: Opcoes) {
  if (!uuidValido(conversaId)) throw new Error("Conversa inválida.");
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
        const pagina = await listarMensagens(conversaId, { limite: 50, signal: abortar.signal });
        if (ativo) aoAtualizar(pagina);
      }
    } catch (erro) {
      if (ativo) {
        aoErro(erro instanceof Error ? erro : new Error("Falha ao sincronizar mensagens."));
        if (erro instanceof FalhaClienteMensagens && (erro.status === 401 || erro.status === 403))
          await encerrar();
      }
    } finally {
      executando = false;
    }
  }

  const canal = supabase.channel(`mensagens:${conversaId}:${crypto.randomUUID()}`)
    .on("postgres_changes", {
      event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversaId}`,
    }, (evento) => {
      if (evento.new.conversation_id === conversaId) void sincronizar();
    })
    .subscribe((estado) => {
      if (!ativo) return;
      // A primeira leitura acontece depois do join. Cada reconexão refaz a leitura
      // para recuperar mensagens gravadas durante a interrupção.
      if (estado === "SUBSCRIBED") void sincronizar();
      else if (estado === "CHANNEL_ERROR" || estado === "TIMED_OUT" || estado === "CLOSED")
        aoErro(new Error("Conexão de mensagens interrompida. Aguarde a reconexão."));
    });

  function encerrar(): Promise<unknown> {
    ativo = false;
    abortar.abort();
    encerramento ??= supabase.removeChannel(canal);
    return encerramento;
  }
  return encerrar;
}
