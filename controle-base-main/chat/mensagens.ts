import { decidirRota } from "../auth/decidir-rota";
import { avaliarSessao } from "../auth/verificar-sessao";
import { criarServidor } from "../supabase/servidor";
import type { ErroMensagens, PaginaMensagens, TextoEnviado } from "./contratos-mensagens";
import { lerPaginacaoMensagens } from "./paginacao-mensagens";
import { consultarHistorico, persistirTexto } from "./repositorio-mensagens";
import { FalhaMensagens, lerEnvioTexto, uuidValido } from "./validar-mensagens";

type Contexto = { params: Promise<{ conversaId: string }> };

function responder(corpo: PaginaMensagens | TextoEnviado | ErroMensagens, status = 200) {
  return Response.json(corpo, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function executar(requisicao: Request, contexto: Contexto, envio: boolean) {
  try {
    const supabase = await criarServidor();
    const acesso = await avaliarSessao(supabase);
    const rota = decidirRota("/api/conversas/mensagens", envio ? "POST" : "GET", acesso.decisao, acesso.ehAdmin);
    if (rota.tipo === "erro-api") return responder({ erro: rota.erro }, rota.codigo);
    if (!acesso.usuario) return responder({ erro: "Sessão ausente ou vencida." }, 401);

    const { conversaId } = await contexto.params;
    if (!uuidValido(conversaId)) return responder({ erro: "Conversa inválida." }, 400);
    const parametros = new URL(requisicao.url).searchParams;
    if (envio) {
      if (parametros.size) return responder({ erro: "O envio não aceita parâmetros na URL." }, 400);
      if (requisicao.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json")
        return responder({ erro: "Use Content-Type application/json." }, 415);
      let entrada: unknown;
      try { entrada = await requisicao.json(); }
      catch { return responder({ erro: "JSON inválido." }, 400); }
      const conteudo = lerEnvioTexto(entrada);
      const mensagem = await persistirTexto(supabase, acesso.usuario.id, conversaId, conteudo);
      return responder({ usuarioId: acesso.usuario.id, mensagem }, 201);
    }
    const paginacao = lerPaginacaoMensagens(parametros);
    if (!paginacao) return responder({ erro: "Paginação inválida. Use limite de 1 a 50 e cursor válido." }, 400);
    return responder(await consultarHistorico(supabase, acesso.usuario.id, conversaId, paginacao));
  } catch (erro) {
    if (erro instanceof FalhaMensagens) return responder({ erro: erro.message }, erro.status);
    return responder({ erro: "Não foi possível processar as mensagens." }, 500);
  }
}

export function GET(requisicao: Request, contexto: Contexto) { return executar(requisicao, contexto, false); }
export function POST(requisicao: Request, contexto: Contexto) { return executar(requisicao, contexto, true); }
