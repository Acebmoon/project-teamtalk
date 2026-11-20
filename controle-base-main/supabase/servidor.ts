import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { obterAmbienteServidor } from "../configuracao/servidor";

export async function criarServidor() {
  const { supabaseUrl, supabaseAnonKey } = obterAmbienteServidor();
  const opcoes = { secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };
  const armazenamento = await cookies();

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: opcoes,
    cookies: {
      getAll: () => armazenamento.getAll(),
      setAll(cookiesParaGravar) {
        // Server Components não podem gravar cookies; o middleware faz a renovação.
        try {
          cookiesParaGravar.forEach(({ name, value, options }) =>
            armazenamento.set(name, value, { ...options, ...opcoes }),
          );
        } catch {
          return;
        }
      },
    },
  });
}
