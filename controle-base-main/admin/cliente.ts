import "server-only";

import { createClient } from "@supabase/supabase-js";
import type { AcessoAdminTI } from "../auth/exigir-admin-ti";
import { ErroAdmin } from "./erros";

// Recebe exclusivamente o contexto devolvido pelo guard, nunca dados do cliente.
export function criarClienteAdmin(acesso: AcessoAdminTI) {
  if (!acesso.usuario.id) throw new ErroAdmin(403, "permissao", "Área restrita à TI.");
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const chave = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !chave) throw new ErroAdmin(503, "configuracao", "Gestão de contas indisponível.");
  return createClient(url, chave, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}
