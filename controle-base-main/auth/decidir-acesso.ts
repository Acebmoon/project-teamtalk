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

  const entrada = Array.isArray(amr)
    ? amr.find(
        (item) =>
          item?.method === "password" &&
          typeof item.timestamp === "number" &&
          Number.isFinite(item.timestamp) &&
          item.timestamp > 0,
      )
    : undefined;

  return !entrada || !Number.isFinite(limiteHoras) || limiteHoras <= 0 ||
    entrada.timestamp > agora || agora - entrada.timestamp >= limiteHoras * 3600
    ? "sessao-vencida"
    : "seguir";
}
