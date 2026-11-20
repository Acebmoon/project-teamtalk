import { decidirRota } from "../auth/decidir-rota";
import { avaliarSessao } from "../auth/verificar-sessao";
import { criarServidor } from "../supabase/servidor";
import type { ErroListagemConversas, PaginaConversas } from "./contratos";
import { consultarConversas } from "./consultar-conversas";
import { lerPaginacao } from "./paginacao";

function responder(corpo: PaginaConversas | ErroListagemConversas, status = 200) {
  return Response.json(corpo, {
    status,
    headers: { "Cache-Control": "private, no-store" },
  });
}

export async function GET(requisicao: Request) {
  try {
    const supabase = await criarServidor();
    const acesso = await avaliarSessao(supabase);
    const rota = decidirRota("/api/conversas", "GET", acesso.decisao, acesso.ehAdmin);
    if (rota.tipo === "erro-api") return responder({ erro: rota.erro }, rota.codigo);
    if (!acesso.usuario) return responder({ erro: "Sessão ausente ou vencida." }, 401);

    const parametros = lerPaginacao(new URL(requisicao.url).searchParams);
    if (!parametros) return responder({ erro: "Paginação inválida. Use limite de 1 a 50 e cursor válido." }, 400);

    const pagina = await consultarConversas(supabase, acesso.usuario.id, parametros);
    return responder(pagina);
  } catch {
    return responder({ erro: "Não foi possível listar as conversas." }, 500);
  }
}
