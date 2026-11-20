import "server-only";

import { ErroAdmin } from "../admin/erros";
import { emailIndividual } from "./validacao";

export function configurarEmail() {
  const falha = () => new ErroAdmin(503, "email-configuracao", "Envio de primeiro acesso indisponível. Solicite a configuração à TI.");
  const provedor = process.env.EMAIL_PROVIDER ?? "disabled";
  const remetente = process.env.EMAIL_FROM ?? "";
  const chave = process.env.EMAIL_API_KEY ?? "";
  const validadeHoras = Number(process.env.CREDENCIAL_INICIAL_VALIDADE_HORAS ?? "24");
  if (provedor !== "resend" || !emailIndividual(remetente) || !chave.trim() || /\s/.test(chave)
    || !Number.isInteger(validadeHoras) || validadeHoras < 1 || validadeHoras > 168) throw falha();
  let url: URL;
  try { url = new URL(process.env.TEAMTALK_PUBLIC_URL ?? ""); } catch { throw falha(); }
  const local = process.env.NODE_ENV !== "production" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:")) || url.username || url.password
    || url.search || url.hash || url.pathname !== "/") throw falha();
  return { remetente, chave, validadeHoras, urlLogin: new URL("/login", url.origin).href };
}

export type ConfiguracaoEmail = ReturnType<typeof configurarEmail>;
