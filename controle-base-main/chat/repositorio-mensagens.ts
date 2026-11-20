import type { SupabaseClient } from "@supabase/supabase-js";
import type { MensagemChat, PaginaMensagens } from "./contratos-mensagens";
import { codificarCursorMensagens, type PaginacaoMensagens } from "./paginacao-mensagens";
import { FalhaMensagens, validarTexto } from "./validar-mensagens";

type LinhaMensagem = {
  id: string;
  conversation_id: string;
  sender_id: string;
  message_type: "text" | "pdf";
  body: string | null;
  attachment_name: string | null;
  created_at: string;
  edited_at: string | null;
};

const campos = "id,conversation_id,sender_id,message_type,body,attachment_name,created_at,edited_at";

function paraMensagem(linha: LinhaMensagem): MensagemChat {
  const comum = {
    id: linha.id, conversaId: linha.conversation_id, remetenteId: linha.sender_id,
    criadaEm: linha.created_at, editadaEm: linha.edited_at,
  };
  if (linha.message_type === "text" && typeof linha.body === "string" && linha.attachment_name === null)
    return { ...comum, tipo: "text", conteudo: linha.body, nomeArquivo: null };
  if (linha.message_type === "pdf" && linha.body === null && typeof linha.attachment_name === "string")
    return { ...comum, tipo: "pdf", conteudo: null, nomeArquivo: linha.attachment_name };
  throw new Error("Mensagem incompatível com o contrato.");
}

async function exigirParticipacao(supabase: SupabaseClient, usuarioId: string, conversaId: string) {
  const acesso = await supabase.rpc("can_access_conversation", { p_conversation_id: conversaId });
  if (acesso.error) throw new Error("Falha ao verificar autorização da conversa.");
  if (acesso.data !== true) throw new FalhaMensagens(403, "Acesso não autorizado à conversa.");
  const participante = await supabase.from("conversation_participants").select("user_id")
    .eq("conversation_id", conversaId).eq("user_id", usuarioId).maybeSingle();
  if (participante.error) throw new Error("Falha ao verificar participação.");
  if (participante.data?.user_id !== usuarioId)
    throw new FalhaMensagens(403, "Acesso não autorizado à conversa.");
}

export async function consultarHistorico(
  supabase: SupabaseClient, usuarioId: string, conversaId: string,
  { limite, cursor }: PaginacaoMensagens,
): Promise<PaginaMensagens> {
  await exigirParticipacao(supabase, usuarioId, conversaId);
  let consulta = supabase.from("messages").select(campos).eq("conversation_id", conversaId);
  if (cursor) {
    // Os dois campos são validados antes de compor a expressão PostgREST.
    consulta = consulta.or(`created_at.lt.${cursor.criadaEm},and(created_at.eq.${cursor.criadaEm},id.lt.${cursor.id})`);
  }
  const { data, error } = await consulta.order("created_at", { ascending: false })
    .order("id", { ascending: false }).limit(limite + 1);
  if (error) throw new Error("Falha ao consultar histórico.");
  const linhas = (data ?? []) as LinhaMensagem[];
  if (linhas.some((linha) => linha.conversation_id !== conversaId))
    throw new Error("Histórico retornou mensagem de outra conversa.");
  const pagina = linhas.slice(0, limite);
  const ultima = pagina.at(-1);
  const proximoCursor = linhas.length > limite && ultima
    ? codificarCursorMensagens({ criadaEm: ultima.created_at, id: ultima.id }) : null;
  return {
    usuarioId, conversaId,
    mensagens: pagina.reverse().map(paraMensagem),
    paginacao: { limite, proximoCursor },
  };
}

export async function persistirTexto(
  supabase: SupabaseClient, usuarioId: string, conversaId: string, conteudo: string,
): Promise<MensagemChat> {
  const body = validarTexto(conteudo);
  await exigirParticipacao(supabase, usuarioId, conversaId);
  const { data, error } = await supabase.from("messages").insert({
    conversation_id: conversaId, sender_id: usuarioId, message_type: "text",
    body, attachment_path: null, attachment_name: null,
  }).select(campos).single();
  // A policy revalida a autorização no instante da escrita, inclusive após revogação.
  if (error?.code === "42501") throw new FalhaMensagens(403, "Acesso não autorizado à conversa.");
  if (error || !data) throw new Error("Falha ao persistir mensagem.");
  const linha = data as LinhaMensagem;
  if (linha.conversation_id !== conversaId || linha.sender_id !== usuarioId || linha.message_type !== "text")
    throw new Error("A mensagem persistida não corresponde à identidade autenticada.");
  return paraMensagem(linha);
}
