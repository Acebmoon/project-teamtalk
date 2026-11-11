import type { DecisaoAcesso } from "./decidir-acesso";

export type ResultadoRota =
  | { tipo: "seguir"; encerrarSessao?: boolean }
  | { tipo: "redirecionar"; caminho: string; codigo: 303 | 307; encerrarSessao?: boolean }
  | { tipo: "erro-api"; codigo: 401 | 403; erro: string; encerrarSessao?: boolean };

export function decidirRota(
  rota: string, metodo: string, decisao: DecisaoAcesso, ehAdmin: boolean,
): ResultadoRota {
  const codigo = metodo === "GET" || metodo === "HEAD" ? 307 : 303;
  const redirecionar = (caminho: string, encerrarSessao = false): ResultadoRota =>
    ({ tipo: "redirecionar", caminho, codigo, encerrarSessao });
  const api = rota === "/api" || rota.startsWith("/api/");
  const admin = rota === "/admin" || rota.startsWith("/admin/");
  const apiAdmin = rota === "/api/admin" || rota.startsWith("/api/admin/");

  if (api) {
    if (decisao === "login" || decisao === "sessao-vencida")
      return { tipo: "erro-api", codigo: 401, erro: "Sessão ausente ou vencida.", encerrarSessao: decisao === "sessao-vencida" };
    if (decisao === "acesso-negado" || decisao === "trocar-senha")
      return { tipo: "erro-api", codigo: 403, erro: "Acesso não autorizado.", encerrarSessao: decisao === "acesso-negado" };
    if (apiAdmin && !ehAdmin)
      return { tipo: "erro-api", codigo: 403, erro: "Área restrita à TI." };
    return { tipo: "seguir" };
  }

  if (decisao === "login")
    return rota === "/login" ? { tipo: "seguir" } : redirecionar("/login");

  if (decisao === "acesso-negado" || decisao === "sessao-vencida") {
    if (rota === "/login") return { tipo: "seguir", encerrarSessao: true };
    return redirecionar(decisao === "acesso-negado"
      ? "/login?erro=acesso" : "/login?erro=sessao", true);
  }

  if (decisao === "trocar-senha")
    return rota === "/primeiro-acesso" ? { tipo: "seguir" } : redirecionar("/primeiro-acesso");

  if (rota === "/login" || rota === "/primeiro-acesso") return redirecionar("/");
  if (admin && !ehAdmin) return redirecionar("/");
  return { tipo: "seguir" };
}
