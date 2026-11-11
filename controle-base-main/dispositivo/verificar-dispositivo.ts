// Restrição de uso por cabeçalhos: não substitui autenticação nem RBAC.
export function dispositivoPermitido(userAgent: string | null, plataforma: string | null): boolean {
  if (plataforma !== null) return plataforma.trim().replace(/^"|"$/g, "") === "Android";
  return /Android|iPhone|iPod/i.test(userAgent ?? "");
}
