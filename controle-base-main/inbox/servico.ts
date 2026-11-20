import type { SupabaseClient } from "@supabase/supabase-js";
import { ErroInbox, PREFERENCIA_PADRAO, type PreferenciaConversa, type RespostaPreferenciasInbox } from "./contratos";
import { lerAtualizacao, objeto, validarConversaIds, validarPreferencia } from "./validacao";

const CAMPOS = "user_id,conversation_id,priority,situation,is_favorite";
const indisponivel = () => new ErroInbox(404, "Conversa indisponível.");

function conferirErro(erro: { code?: string } | null) {
  if (!erro) return;
  // Uma revogação entre autorização e escrita também não revela existência.
  if (erro.code === "42501" || erro.code === "23503") throw indisponivel();
  throw new ErroInbox(500, "Não foi possível acessar as preferências.");
}

async function exigirParticipacao(supabase: SupabaseClient, usuarioId: string, ids: string[]) {
  // RLS aplica can_access_conversation(); a checagem explícita de user_id
  // garante que nem Admin TI ganhe acesso apenas por seu papel.
  const { data, error } = await supabase.from("conversation_participants")
    .select("conversation_id").eq("user_id", usuarioId).in("conversation_id", ids);
  conferirErro(error);
  const autorizadas = new Set((data ?? []).map((linha) => linha.conversation_id as string));
  if (autorizadas.size !== ids.length || ids.some((id) => !autorizadas.has(id))) throw indisponivel();
}

function paraResposta(linhas: unknown, usuarioId: string, ids: string[]): RespostaPreferenciasInbox {
  if (!Array.isArray(linhas)) throw new ErroInbox(500, "Resposta de preferências inválida.");
  const porConversa = new Map<string, PreferenciaConversa>();
  for (const linha of linhas) {
    if (!objeto(linha) || linha.user_id !== usuarioId || typeof linha.conversation_id !== "string"
      || !ids.includes(linha.conversation_id) || porConversa.has(linha.conversation_id))
      throw new ErroInbox(500, "Resposta de preferências inválida.");
    const preferencia = {
      conversaId: linha.conversation_id, prioridade: linha.priority,
      situacao: linha.situation, favorita: linha.is_favorite,
    };
    if (!validarPreferencia(preferencia)) throw new ErroInbox(500, "Resposta de preferências inválida.");
    porConversa.set(preferencia.conversaId, preferencia);
  }
  return {
    usuarioId,
    preferencias: ids.map((conversaId) => porConversa.get(conversaId) ?? { conversaId, ...PREFERENCIA_PADRAO }),
  };
}

// O chamador HTTP autentica com criarServidor()/avaliarSessao(). Todas as
// operações usam o mesmo cliente da sessão, nunca service_role.
export async function listarPreferencias(supabase: SupabaseClient, usuarioId: string, conversaIds: string[]) {
  const ids = validarConversaIds(conversaIds);
  await exigirParticipacao(supabase, usuarioId, ids);
  const { data, error } = await supabase.from("inbox_preferences").select(CAMPOS)
    .eq("user_id", usuarioId).in("conversation_id", ids);
  conferirErro(error);
  return paraResposta(data ?? [], usuarioId, ids);
}

export async function salvarPreferencias(supabase: SupabaseClient, usuarioId: string, entrada: PreferenciaConversa[]) {
  const preferencias = lerAtualizacao({ preferencias: entrada });
  const ids = preferencias.map((pref) => pref.conversaId);
  await exigirParticipacao(supabase, usuarioId, ids);
  // Um único INSERT ... ON CONFLICT torna o lote atômico. PUT substitui os
  // três campos; uma linha jamais herda o user_id de um corpo enviado pelo cliente.
  const { data, error } = await supabase.from("inbox_preferences").upsert(preferencias.map((pref) => ({
    user_id: usuarioId, conversation_id: pref.conversaId, priority: pref.prioridade,
    situation: pref.situacao, is_favorite: pref.favorita,
  })), { onConflict: "user_id,conversation_id" }).select(CAMPOS);
  conferirErro(error);
  if (data?.length !== preferencias.length) throw indisponivel();
  return paraResposta(data, usuarioId, ids);
}

export async function excluirPreferencias(supabase: SupabaseClient, usuarioId: string, conversaIds: string[]) {
  const ids = validarConversaIds(conversaIds);
  await exigirParticipacao(supabase, usuarioId, ids);
  const { error } = await supabase.from("inbox_preferences").delete()
    .eq("user_id", usuarioId).in("conversation_id", ids);
  conferirErro(error);
  return paraResposta([], usuarioId, ids);
}
