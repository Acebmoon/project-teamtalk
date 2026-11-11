import { NextResponse } from "next/server";
import { exigirAdminTI } from "../auth/exigir-admin-ti";

export async function GET() {
  const acesso = await exigirAdminTI();
  if (!acesso) return NextResponse.json({ erro: "Área restrita à TI." }, { status: 403 });
  return NextResponse.json({ papel: "it_admin" });
}
