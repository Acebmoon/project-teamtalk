import { criarServidor } from "../supabase/servidor";
import { avaliarSessao } from "./verificar-sessao";
import { ErroAdmin } from "../admin/erros";

// Chamar no início de toda página, rota de API e server action da TI.
export async function exigirAdminTI() {
  const supabase = await criarServidor();
  const { decisao, ehAdmin, usuario } = await avaliarSessao(supabase);
  if (decisao === "login" || decisao === "sessao-vencida")
    throw new ErroAdmin(401, "sessao", "Sessão ausente ou vencida.");
  if (decisao !== "seguir" || !ehAdmin || !usuario)
    throw new ErroAdmin(403, "permissao", "Área restrita à TI. Conclua também a troca da senha provisória.");
  return { supabase, usuario };
}

export type AcessoAdminTI = Awaited<ReturnType<typeof exigirAdminTI>>;

