"use server";

import { redirect } from "next/navigation";
import { criarServidor } from "../supabase/servidor";

export async function sair(): Promise<void> {
  const supabase = await criarServidor();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}
