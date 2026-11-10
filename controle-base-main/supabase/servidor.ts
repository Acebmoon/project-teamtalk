import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const chave = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const opcoes = { secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

export async function criarServidor() {
  const armazenamento = await cookies();

  return createServerClient(url, chave, {
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
