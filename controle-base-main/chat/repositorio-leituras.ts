import type { SupabaseClient } from "@supabase/supabase-js";
import type { LeituraRegistrada, StatusLeiturasConversa } from "./contratos-leituras";
import { FalhaLeituras } from "./validar-leituras";

type LinhaStatus = {
  message_id: string; conversation_id: string; sender_id: string;
  recipients: { user_id: string; joined_at: string; read_at: string | null }[];
};
type LinhaLeitura = { message_id: string; user_id: string; read_at: string };

function verificarErro(erro: { code?: string } | null) {
  if (erro?.code === "42501") throw new FalhaLeituras(403, "Acesso não autorizado às mensagens.");
  if (erro?.code === "22023") throw new FalhaLeituras(400, "Lista de mensagens inválida.");
  if (erro) throw new Error("Falha na operação de leituras.");
}

async function exigirParticipacao(supabase: SupabaseClient, usuarioId: string, conversaId: string) {
  const acesso = await supabase.rpc("can_access_conversation", { p_conversation_id: conversaId });
  verificarErro(acesso.error);
  if (acesso.data !== true) throw new FalhaLeituras(403, "Acesso não autorizado à conversa.");
  const participante = await supabase.from("conversation_participants").select("user_id")
    .eq("conversation_id", conversaId).eq("user_id", usuarioId).maybeSingle();
  verificarErro(participante.error);
  if (participante.data?.user_id !== usuarioId)
    throw new FalhaLeituras(403, "Acesso não autorizado à conversa.");
}

export async function consultarLeituras(
  supabase: SupabaseClient, usuarioId: string, conversaId: string, mensagemIds: string[],
): Promise<StatusLeiturasConversa> {
  await exigirParticipacao(supabase, usuarioId, conversaId);
  // A RPC invoker confere can_access_message() para cada ID e reaplica a RLS.
  const { data, error } = await supabase.rpc("get_message_read_status", {
    p_conversation_id: conversaId, p_message_ids: mensagemIds,
  });
  verificarErro(error);
  const linhas = (data ?? []) as LinhaStatus[];
  const ids = new Set(linhas.map((linha) => linha.message_id));
  if (ids.size !== mensagemIds.length || linhas.length !== mensagemIds.length
    || linhas.some((linha) => linha.conversation_id !== conversaId || !mensagemIds.includes(linha.message_id)))
    throw new Error("Status de leitura incompatível com as mensagens solicitadas.");
  return {
    usuarioId, conversaId,
    mensagens: linhas.map((linha) => ({
      mensagemId: linha.message_id, remetenteId: linha.sender_id,
      destinatarios: linha.recipients.map((destinatario) => ({
        usuarioId: destinatario.user_id, entrouEm: destinatario.joined_at, lidaEm: destinatario.read_at,
      })),
    })),
  };
}

export async function registrarLeitura(
  supabase: SupabaseClient, usuarioId: string, conversaId: string, mensagemId: string,
): Promise<LeituraRegistrada> {
  await exigirParticipacao(supabase, usuarioId, conversaId);
  const { data, error } = await supabase.rpc("register_message_read", {
    p_conversation_id: conversaId, p_message_id: mensagemId,
  });
  verificarErro(error);
  const linhas = (data ?? []) as LinhaLeitura[];
  const leitura = linhas[0];
  if (linhas.length !== 1 || leitura.message_id !== mensagemId || leitura.user_id !== usuarioId || !leitura.read_at)
    throw new Error("Recibo incompatível com a identidade autenticada.");
  return { usuarioId, conversaId, leitura: {
    mensagemId: leitura.message_id, usuarioId: leitura.user_id, lidaEm: leitura.read_at,
  } };
}
