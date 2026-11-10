export type DecisaoAcesso = "seguir" | "login" | "acesso-negado" | "sessao-vencida";

export function decidirAcesso({
  usuarioValido,
  autorizado,
  amr,
  agora,
  limiteHoras,
}: {
  usuarioValido: boolean;
  autorizado: boolean;
  amr: unknown;
  agora: number;
  limiteHoras: number;
}): DecisaoAcesso {
  if (!usuarioValido) return "login";
  if (!autorizado) return "acesso-negado";

  const horarios = Array.isArray(amr)
    ? amr
        .filter(
          (item) =>
            typeof item?.method === "string" &&
            item.method !== "token_refresh" &&
            typeof item.timestamp === "number" &&
            Number.isFinite(item.timestamp) &&
            item.timestamp > 0,
        )
        .map((item) => item.timestamp as number)
    : [];
  const inicio = horarios.length ? Math.min(...horarios) : null;

  return inicio === null || !Number.isFinite(limiteHoras) || limiteHoras <= 0 ||
    inicio > agora + 300 || agora - inicio >= limiteHoras * 3600
    ? "sessao-vencida"
    : "seguir";
}
