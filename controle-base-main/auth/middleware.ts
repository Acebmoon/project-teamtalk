import { NextRequest, NextResponse } from "next/server";
import { decidirAcesso } from "./decidir-acesso";
import { criarServidorMiddleware } from "../supabase/middleware";

export async function middleware(requisicao: NextRequest) {
  const publica = requisicao.nextUrl.pathname === "/login";
  const { supabase, contexto } = criarServidorMiddleware(requisicao);
  const { data: usuario } = await supabase.auth.getUser();
  const user = usuario?.user;

  if (!user) {
    if (publica) return contexto.resposta;
    const destino = NextResponse.redirect(new URL("/login", requisicao.url));
    contexto.resposta.cookies.getAll().forEach((cookie) => destino.cookies.set(cookie));
    return destino;
  }

  const { data: verificacao } = await supabase.auth.getClaims();
  const claims = verificacao?.claims;
  const { data: autorizado, error } = await supabase.rpc("is_active_authorized_user");
  const decisao = decidirAcesso({
    usuarioValido: true,
    autorizado: !error && autorizado === true,
    amr: claims?.amr,
    agora: Date.now() / 1000,
    limiteHoras: Number(process.env.SESSAO_MAX_HORAS ?? 12),
  });

  if (decisao === "seguir" && !publica) return contexto.resposta;
  if (decisao !== "seguir") await supabase.auth.signOut({ scope: "local" });

  const destino = NextResponse.redirect(
    new URL(
      decisao === "seguir"
        ? "/"
        : decisao === "acesso-negado"
          ? "/login?erro=acesso"
          : "/login?erro=sessao",
      requisicao.url,
    ),
  );
  contexto.resposta.cookies.getAll().forEach((cookie) => destino.cookies.set(cookie));
  return destino;
}
