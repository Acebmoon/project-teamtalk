import type { SupabaseClient } from "@supabase/supabase-js";
import type { ConversaListada, PaginaConversas } from "./contratos";
import { codificarCursor, type ParametrosListagem } from "./paginacao";

type LinhaConversa = {
  id: string;
  type: "direct" | "group";
  title: string | null;
  created_at: string;
  updated_at: string;
  activity_at: string;
  participants: { user_id: string; joined_at: string }[];
  last_message: {
    id: string;
    sender_id: string;
    message_type: "text" | "pdf";
    body: string | null;
    attachment_name: string | null;
    created_at: string;
  } | null;
  unread_count: number;
};

function paraContrato(linha: LinhaConversa): ConversaListada {
  const mensagem = linha.last_message;
  return {
    id: linha.id,
    tipo: linha.type,
    titulo: linha.title?.trim() || (linha.type === "group" ? "Conversa em grupo" : "Conversa direta"),
    criadaEm: linha.created_at,
    atualizadaEm: linha.updated_at,
    atividadeEm: linha.activity_at,
    participantes: linha.participants.map((participante) => ({
      usuarioId: participante.user_id,
      entrouEm: participante.joined_at,
    })),
    ultimaMensagem: mensagem && {
      id: mensagem.id,
      remetenteId: mensagem.sender_id,
      tipo: mensagem.message_type,
      conteudo: mensagem.body,
      nomeArquivo: mensagem.attachment_name,
      criadaEm: mensagem.created_at,
    },
    naoLidas: linha.unread_count,
  };
}

export async function consultarConversas(
  supabase: SupabaseClient,
  usuarioId: string,
  { limite, cursor }: ParametrosListagem,
): Promise<PaginaConversas> {
  const { data, error } = await supabase.rpc("list_authorized_conversations", {
    p_limit: limite,
    p_before_activity_at: cursor?.atividadeEm ?? null,
    p_before_id: cursor?.id ?? null,
  });
  if (error) throw new Error("Falha ao consultar conversas autorizadas.");
  const linhas = (data ?? []) as LinhaConversa[];

  // A RPC usa auth.uid() e RLS. O servidor também confere a participação
  // antes de devolver qualquer dado ou produzir um cursor com a linha extra.
  if (linhas.some((linha) => !linha.participants.some((p) => p.user_id === usuarioId)))
    throw new Error("A consulta retornou uma conversa sem participação do usuário.");

  const pagina = linhas.slice(0, limite);
  const ultima = pagina.at(-1);
  const proximoCursor = linhas.length > limite && ultima
    ? codificarCursor({ atividadeEm: ultima.activity_at, id: ultima.id })
    : null;

  return {
    usuarioId,
    conversas: pagina.map(paraContrato),
    paginacao: { limite, proximoCursor },
  };
}
