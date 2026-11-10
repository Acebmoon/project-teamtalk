import { createBrowserClient } from "@supabase/ssr";

export function criarNavegador() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookieOptions: { secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/" } },
  );
}
