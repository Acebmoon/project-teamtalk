import { NextRequest, NextResponse } from "next/server";
import { dispositivoPermitido } from "../dispositivo/verificar-dispositivo";
import { criarServidorMiddleware } from "../supabase/middleware";
import { decidirRota } from "./decidir-rota";
import { avaliarSessao } from "./verificar-sessao";

export async function middleware(requisicao: NextRequest) {
  const rota = requisicao.nextUrl.pathname;
  const metodo = requisicao.method.toUpperCase();
  const leitura = metodo === "GET" || metodo === "HEAD";
  const bloqueio = rota === "/dispositivo-bloqueado";
  const permitido = dispositivoPermitido(
    requisicao.headers.get("user-agent"), requisicao.headers.get("sec-ch-ua-platform"),
  );

  // Antes do Supabase, inclusive em server actions e chamadas diretas de API.
  if (!permitido) {
    if (bloqueio && leitura) return NextResponse.next({ request: requisicao });
    if (!leitura) return new NextResponse(null, { status: 403 });
    return NextResponse.redirect(new URL("/dispositivo-bloqueado", requisicao.url));
  }
  if (bloqueio)
    return NextResponse.redirect(new URL("/", requisicao.url), leitura ? 307 : 303);

  const { supabase, contexto } = criarServidorMiddleware(requisicao);
  const { decisao, ehAdmin } = await avaliarSessao(supabase);
  const plano = decidirRota(rota, metodo, decisao, ehAdmin);
  if (plano.encerrarSessao) await supabase.auth.signOut({ scope: "local" });
  if (plano.tipo === "seguir") return contexto.resposta;

  const resposta = plano.tipo === "redirecionar"
    ? NextResponse.redirect(new URL(plano.caminho, requisicao.url), plano.codigo)
    : NextResponse.json({ erro: plano.erro }, { status: plano.codigo });
  contexto.resposta.cookies.getAll().forEach((cookie) => resposta.cookies.set(cookie));
  return resposta;
}
