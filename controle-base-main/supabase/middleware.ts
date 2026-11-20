import { createServerClient } from "@supabase/ssr";
import { NextRequest, NextResponse } from "next/server";
import { obterAmbienteServidor } from "../configuracao/servidor";

export function criarServidorMiddleware(requisicao: NextRequest) {
  const { supabaseUrl, supabaseAnonKey } = obterAmbienteServidor();
  const contexto = { resposta: NextResponse.next({ request: requisicao }) };
  const opcoes = { secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookieOptions: opcoes,
      cookies: {
        getAll: () => requisicao.cookies.getAll(),
        setAll(cookiesParaGravar) {
          cookiesParaGravar.forEach(({ name, value }) => requisicao.cookies.set(name, value));
          contexto.resposta = NextResponse.next({ request: requisicao });
          cookiesParaGravar.forEach(({ name, value, options }) =>
            contexto.resposta.cookies.set(name, value, { ...options, ...opcoes }),
          );
        },
      },
    },
  );
  return { supabase, contexto };
}
