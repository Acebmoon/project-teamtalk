import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ArquivoPdf, PdfEnviado } from "./contratos";
import { criarArmazenamentoPdf } from "./armazenamento";
import { ErroPdf } from "./erro";
import { validarNomePdf, validarPdf } from "./validar-pdf";

export function validarId(id: string): string {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new ErroPdf(400, "ID_INVALIDO", "Identificador inválido.");
  }
  return id.toLowerCase();
}

export async function autorizarConversa(supabase: SupabaseClient, conversaId: string) {
  const { data, error } = await supabase.rpc("can_access_conversation", { p_conversation_id: conversaId });
  if (error) throw new ErroPdf(500, "AUTORIZACAO_INDISPONIVEL", "Não foi possível verificar a participação.");
  if (data !== true) throw new ErroPdf(403, "ACESSO_NEGADO", "Acesso à conversa negado.");
}

export async function publicarPdf(
  supabase: SupabaseClient, usuarioId: string, conversaId: string, arquivo: ArquivoPdf, limite: number,
): Promise<PdfEnviado> {
  await autorizarConversa(supabase, conversaId);
  const { bytes, nome } = await validarPdf(arquivo, limite);
  const caminho = `${conversaId}/${usuarioId}/${randomUUID()}.pdf`;
  const storage = criarArmazenamentoPdf();
  const { error: erroUpload } = await storage.upload(caminho, bytes, {
    contentType: "application/pdf", upsert: false, cacheControl: "0",
  });
  if (erroUpload) throw new ErroPdf(500, "UPLOAD_FALHOU", "Não foi possível armazenar o PDF.");

  try {
    // JWT do participante: a RLS revalida participação e o objeto privado já validado.
    const { data, error } = await supabase.from("messages").insert({
      conversation_id: conversaId, sender_id: usuarioId, message_type: "pdf", body: null,
      attachment_path: caminho, attachment_name: nome,
    }).select("id, created_at").single();
    if (error?.code === "42501") throw new ErroPdf(403, "ACESSO_NEGADO", "Acesso à conversa negado.");
    if (error || !data) throw new ErroPdf(500, "MENSAGEM_FALHOU", "Não foi possível registrar o PDF na conversa.");
    return {
      usuarioId,
      mensagem: {
        id: data.id, conversaId, remetenteId: usuarioId, criadaEm: data.created_at,
        editadaEm: null, tipo: "pdf", conteudo: null, nomeArquivo: nome,
      },
      anexo: {
        tamanhoBytes: bytes.length,
        downloadUrl: `/api/conversas/${conversaId}/anexos/${data.id}`,
      },
    };
  } catch (erro) {
    // Falha de persistência/revogação não deixa um anexo disponibilizado sem mensagem.
    const { error: erroRemocao } = await storage.remove([caminho]);
    if (erroRemocao) {
      // Sem nomes, caminhos, bytes ou chaves nos logs. O órfão continua inacessível.
      console.error("Falha ao compensar upload de PDF sem mensagem.");
    }
    throw erro;
  }
}

export async function baixarPdf(supabase: SupabaseClient, conversaId: string, mensagemId: string) {
  await autorizarConversa(supabase, conversaId);
  const { data, error } = await supabase.from("messages")
    .select("sender_id, attachment_path, attachment_name")
    .eq("id", mensagemId).eq("conversation_id", conversaId).eq("message_type", "pdf").maybeSingle();
  if (error) throw new ErroPdf(500, "CONSULTA_FALHOU", "Não foi possível consultar o anexo.");
  if (!data) throw new ErroPdf(404, "ANEXO_NAO_ENCONTRADO", "Anexo PDF não encontrado.");
  const prefixo = `${conversaId}/${data.sender_id}/`;
  const sufixo = typeof data.attachment_path === "string" && data.attachment_path.startsWith(prefixo)
    ? data.attachment_path.slice(prefixo.length) : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.pdf$/.test(sufixo)) {
    throw new ErroPdf(404, "ANEXO_NAO_ENCONTRADO", "Anexo PDF não encontrado.");
  }
  const nome = validarNomePdf(data.attachment_name ?? "");
  const { data: arquivo, error: erroDownload } = await criarArmazenamentoPdf().download(data.attachment_path);
  if (erroDownload || !arquivo) throw new ErroPdf(500, "DOWNLOAD_FALHOU", "Não foi possível obter o PDF.");
  return { arquivo, nome };
}
