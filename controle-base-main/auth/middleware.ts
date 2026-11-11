import { NextRequest, NextResponse } from "next/server";
import { criarServidorMiddleware } from "../supabase/middleware";
import { avaliarSessao } from "./verificar-sessao";

export async function middleware(requisicao: NextRequest) {
  const rota = requisicao.nextUrl.pathname;
  const { supabase, contexto } = criarServidorMiddleware(requisicao);
  const { decisao } = await avaliarSessao(supabase);

  function redirecionar(caminho: string) {
    const resposta = NextResponse.redirect(new URL(caminho, requisicao.url));
    contexto.resposta.cookies.getAll().forEach((cookie) => resposta.cookies.set(cookie));
    return resposta;
  }

  if (decisao === "login")
    return rota === "/login" ? contexto.resposta : redirecionar("/login");

  if (decisao === "acesso-negado" || decisao === "sessao-vencida") {
    await supabase.auth.signOut({ scope: "local" });
    if (rota === "/login") return contexto.resposta;
    return redirecionar(decisao === "acesso-negado"
      ? "/login?erro=acesso" : "/login?erro=sessao");
  }

  if (decisao === "trocar-senha")
    return rota === "/primeiro-acesso" ? contexto.resposta : redirecionar("/primeiro-acesso");

  return rota === "/login" || rota === "/primeiro-acesso"
    ? redirecionar("/") : contexto.resposta;
}
