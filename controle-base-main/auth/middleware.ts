import { NextRequest, NextResponse } from "next/server";
import { criarServidorMiddleware } from "../supabase/middleware";
import { avaliarSessao } from "./verificar-sessao";

export async function middleware(requisicao: NextRequest) {
  const publica = requisicao.nextUrl.pathname === "/login";
  const { supabase, contexto } = criarServidorMiddleware(requisicao);
  const { decisao, usuario } = await avaliarSessao(supabase);

  if (publica && decisao !== "seguir") {
    if (usuario) await supabase.auth.signOut({ scope: "local" });
    return contexto.resposta;
  }
  if (!publica && decisao === "seguir") return contexto.resposta;

  if (!publica && usuario) await supabase.auth.signOut({ scope: "local" });
  const destino = NextResponse.redirect(
    new URL(
      publica
        ? "/"
        : decisao === "acesso-negado"
          ? "/login?erro=acesso"
          : decisao === "sessao-vencida"
            ? "/login?erro=sessao"
            : "/login",
      requisicao.url,
    ),
  );
  contexto.resposta.cookies.getAll().forEach((cookie) => destino.cookies.set(cookie));
  return destino;
}
