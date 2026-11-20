import { exigirAdminTI } from "../auth/exigir-admin-ti";
import { respostaAdmin, respostaErroAdmin } from "./http";

export async function GET() {
  try {
    await exigirAdminTI();
    return respostaAdmin({ papel: "it_admin" });
  } catch (erro) { return respostaErroAdmin(erro); }
}

