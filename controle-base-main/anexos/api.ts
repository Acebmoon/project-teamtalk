import { criarServidor } from "@controle/supabase/servidor";
import { avaliarSessao } from "@controle/auth/verificar-sessao";
import { ErroPdf } from "./erro";
import { lerArquivoPdf } from "./formulario";
import { autorizarConversa, baixarPdf, publicarPdf, validarId } from "./servico";
import { obterLimitePdf } from "./validar-pdf";

const cabecalhos = { "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff" };

async function autenticar() {
  const supabase = await criarServidor();
  const { decisao, usuario } = await avaliarSessao(supabase);
  if (decisao === "login" || decisao === "sessao-vencida" || !usuario) {
    throw new ErroPdf(401, "SESSAO_INVALIDA", "Entre novamente para acessar anexos.");
  }
  if (decisao !== "seguir") {
    throw new ErroPdf(403, "ACESSO_NEGADO", "Conta sem autorização para acessar anexos.");
  }
  return { supabase, usuarioId: usuario.id };
}

function responderErro(erro: unknown) {
  const falha = erro instanceof ErroPdf ? erro : new ErroPdf(500, "ERRO_INTERNO", "Não foi possível processar o anexo.");
  return Response.json({ erro: falha.message, codigo: falha.codigo }, { status: falha.status, headers: cabecalhos });
}

export async function enviarPdf(request: Request, contexto: { params: Promise<{ conversaId: string }> }) {
  try {
    const { supabase, usuarioId } = await autenticar();
    const conversaId = validarId((await contexto.params).conversaId);
    // Autorize antes de ler o corpo, inclusive quando chamado sem middleware.
    await autorizarConversa(supabase, conversaId);
    const limite = obterLimitePdf();
    const arquivo = await lerArquivoPdf(request, limite);
    const resultado = await publicarPdf(supabase, usuarioId, conversaId, arquivo, limite);
    return Response.json(resultado, { status: 201, headers: cabecalhos });
  } catch (erro) {
    return responderErro(erro);
  }
}

export async function obterPdf(
  _request: Request, contexto: { params: Promise<{ conversaId: string; mensagemId: string }> },
) {
  try {
    const { supabase } = await autenticar();
    const params = await contexto.params;
    const { arquivo, nome } = await baixarPdf(supabase, validarId(params.conversaId), validarId(params.mensagemId));
    const nomeCodificado = encodeURIComponent(nome).replace(/['()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    return new Response(arquivo, {
      headers: {
        ...cabecalhos,
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="documento.pdf"; filename*=UTF-8''${nomeCodificado}`,
        "Content-Length": String(arquivo.size),
      },
    });
  } catch (erro) {
    return responderErro(erro);
  }
}
