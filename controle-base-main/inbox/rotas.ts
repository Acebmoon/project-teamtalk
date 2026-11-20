import { decidirRota } from "../auth/decidir-rota";
import { avaliarSessao } from "../auth/verificar-sessao";
import { criarServidor } from "../supabase/servidor";
import { ErroInbox } from "./contratos";
import { excluirPreferencias, listarPreferencias, salvarPreferencias } from "./servico";
import { lerAtualizacao, lerConsulta, lerExclusao } from "./validacao";

function responder(corpo: unknown, status = 200) {
  return Response.json(corpo, { status, headers: { "Cache-Control": "private, no-store", Vary: "Cookie" } });
}

async function lerCorpo(requisicao: Request): Promise<unknown> {
  if (requisicao.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== "application/json")
    throw new ErroInbox(415, "Envie um corpo JSON.");
  const leitor = requisicao.body?.getReader();
  if (!leitor) throw new ErroInbox(400, "JSON inválido.");
  const partes: Uint8Array[] = [];
  let tamanho = 0;
  try {
    while (true) {
      const { done, value } = await leitor.read();
      if (done) break;
      tamanho += value.length;
      if (tamanho > 16_384) {
        await leitor.cancel();
        throw new ErroInbox(413, "Corpo acima do limite de 16 KiB.");
      }
      partes.push(value);
    }
    const bytes = new Uint8Array(tamanho);
    let posicao = 0;
    for (const parte of partes) { bytes.set(parte, posicao); posicao += parte.length; }
    return JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(bytes));
  } catch (erro) {
    if (erro instanceof ErroInbox) throw erro;
    throw new ErroInbox(400, "JSON inválido.");
  } finally {
    leitor.releaseLock();
  }
}

async function executar(requisicao: Request, metodo: "GET" | "PUT" | "DELETE") {
  try {
    const supabase = await criarServidor();
    const acesso = await avaliarSessao(supabase);
    const rota = decidirRota("/api/inbox/preferencias", metodo, acesso.decisao, acesso.ehAdmin);
    if (rota.tipo === "erro-api") return responder({ erro: rota.erro }, rota.codigo);
    if (!acesso.usuario) return responder({ erro: "Sessão ausente ou vencida." }, 401);

    const url = new URL(requisicao.url);
    if (metodo === "GET")
      return responder(await listarPreferencias(supabase, acesso.usuario.id, lerConsulta(url.searchParams)));

    const origem = requisicao.headers.get("origin");
    if (origem && origem !== url.origin) return responder({ erro: "Origem não permitida." }, 403);
    if (url.search) throw new ErroInbox(400, "Envie os parâmetros no corpo JSON.");
    const corpo = await lerCorpo(requisicao);
    return responder(metodo === "PUT"
      ? await salvarPreferencias(supabase, acesso.usuario.id, lerAtualizacao(corpo))
      : await excluirPreferencias(supabase, acesso.usuario.id, lerExclusao(corpo)));
  } catch (erro) {
    return erro instanceof ErroInbox
      ? responder({ erro: erro.message }, erro.status)
      : responder({ erro: "Não foi possível acessar as preferências." }, 500);
  }
}

export const GET = (requisicao: Request) => executar(requisicao, "GET");
export const PUT = (requisicao: Request) => executar(requisicao, "PUT");
export const DELETE = (requisicao: Request) => executar(requisicao, "DELETE");
