import { decidirRota } from "../auth/decidir-rota";
import { avaliarSessao } from "../auth/verificar-sessao";
import { criarServidor } from "../supabase/servidor";
import type { ErroLeituras, LeituraRegistrada, StatusLeiturasConversa } from "./contratos-leituras";
import { consultarLeituras, registrarLeitura } from "./repositorio-leituras";
import { FalhaLeituras, uuidLeituraValido, validarExibicao, validarIdsLeituras } from "./validar-leituras";

type Contexto = { params: Promise<{ conversaId: string; mensagemId?: string }> };

function responder(corpo: ErroLeituras | LeituraRegistrada | StatusLeiturasConversa, status = 200) {
  return Response.json(corpo, { status, headers: { "Cache-Control": "private, no-store" } });
}

async function executar(requisicao: Request, contexto: Contexto, registro: boolean) {
  try {
    const supabase = await criarServidor();
    const acesso = await avaliarSessao(supabase);
    const rota = decidirRota("/api/conversas/leituras", registro ? "POST" : "GET", acesso.decisao, acesso.ehAdmin);
    if (rota.tipo === "erro-api") return responder({ erro: rota.erro }, rota.codigo);
    if (!acesso.usuario) return responder({ erro: "Sessão ausente ou vencida." }, 401);
    const parametros = new URL(requisicao.url).searchParams;
    const { conversaId: conversaBruta, mensagemId: mensagemBruta } = await contexto.params;
    if (!uuidLeituraValido(conversaBruta)) throw new FalhaLeituras(400, "Conversa inválida.");
    const conversaId = conversaBruta.toLowerCase();
    if (!registro) {
      if ([...parametros.keys()].some((chave) => chave !== "mensagemId"))
        throw new FalhaLeituras(400, "Use somente o parâmetro mensagemId.");
      const ids = validarIdsLeituras(parametros.getAll("mensagemId"));
      return responder(await consultarLeituras(supabase, acesso.usuario.id, conversaId, ids));
    }
    if (!uuidLeituraValido(mensagemBruta)) throw new FalhaLeituras(400, "Mensagem inválida.");
    if (parametros.size) throw new FalhaLeituras(400, "O registro não aceita parâmetros na URL.");
    if (requisicao.headers.get("Content-Type")?.split(";")[0].trim().toLowerCase() !== "application/json")
      throw new FalhaLeituras(415, "Use Content-Type application/json.");
    let entrada: unknown;
    try { entrada = await requisicao.json(); }
    catch { throw new FalhaLeituras(400, "JSON inválido."); }
    validarExibicao(entrada);
    return responder(await registrarLeitura(supabase, acesso.usuario.id, conversaId, mensagemBruta.toLowerCase()));
  } catch (erro) {
    if (erro instanceof FalhaLeituras) return responder({ erro: erro.message }, erro.status);
    return responder({ erro: "Não foi possível processar as leituras." }, 500);
  }
}

export function GET(requisicao: Request, contexto: Contexto) { return executar(requisicao, contexto, false); }
export function POST(requisicao: Request, contexto: Contexto) { return executar(requisicao, contexto, true); }
