import { NextRequest, NextResponse } from "next/server";
import { decidirRotaDispositivo, dispositivoPermitido } from "../dispositivo/verificar-dispositivo";
import { criarServidorMiddleware } from "../supabase/middleware";
import { decidirRota } from "./decidir-rota";
import { avaliarSessao } from "./verificar-sessao";

export async function middleware(requisicao: NextRequest) {
  const rota = requisicao.nextUrl.pathname;
  const metodo = requisicao.method.toUpperCase();
  const permitido = dispositivoPermitido(
    requisicao.headers.get("user-agent"), requisicao.headers.get("sec-ch-ua-platform"),
  );
  const dispositivo = decidirRotaDispositivo(rota, metodo, permitido);

  // Antes de qualquer chamada ao Supabase, inclusive em APIs e server actions.
  if (dispositivo === "erro-api")
    return NextResponse.json({ erro: "Dispositivo não permitido." }, { status: 403 });
  if (dispositivo === "erro-vazio") return new NextResponse(null, { status: 403 });
  if (dispositivo === "redirecionar-bloqueio")
    return NextResponse.redirect(new URL("/dispositivo-bloqueado", requisicao.url));
  if (dispositivo === "redirecionar-inicio")
    return NextResponse.redirect(new URL("/", requisicao.url), metodo === "GET" || metodo === "HEAD" ? 307 : 303);
  if (!permitido) return NextResponse.next({ request: requisicao });

  // Prévia pública com dados fictícios: não expõe informações do banco.
  if (rota === "/demo") return NextResponse.next({ request: requisicao });

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
