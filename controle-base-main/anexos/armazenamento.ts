import "server-only";
import { createClient } from "@supabase/supabase-js";
import { ErroPdf } from "./erro";

export const BUCKET_PDF = "chat-pdfs";

// A chave nunca é compartilhada com clientes nem com o client da sessão.
// Só instanciar depois de avaliar a sessão e autorizar a conversa.
export function criarArmazenamentoPdf() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new ErroPdf(500, "STORAGE_INDISPONIVEL", "Armazenamento de PDF indisponível.");
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  }).storage.from(BUCKET_PDF);
}
