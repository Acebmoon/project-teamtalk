import { criarServidor } from "../supabase/servidor";
import { avaliarSessao } from "./verificar-sessao";

// Chamar no início de toda página, rota de API e server action da TI.
export async function exigirAdminTI() {
  const supabase = await criarServidor();
  const { decisao, ehAdmin, usuario } = await avaliarSessao(supabase);
  return decisao === "seguir" && ehAdmin && usuario ? { supabase, usuario } : null;
}
