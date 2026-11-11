// Restrição de uso por cabeçalhos: não substitui autenticação nem RBAC.
export function dispositivoPermitido(userAgent: string | null, plataforma: string | null): boolean {
  if (plataforma !== null) return plataforma.trim().replace(/^"|"$/g, "") === "Android";
  return /Android|iPhone|iPod/i.test(userAgent ?? "");
}

export function decidirRotaDispositivo(rota: string, metodo: string, permitido: boolean) {
  const leitura = metodo === "GET" || metodo === "HEAD";
  const bloqueio = rota === "/dispositivo-bloqueado";
  if (!permitido) {
    if (rota === "/api" || rota.startsWith("/api/")) return "erro-api";
    if (bloqueio && leitura) return "seguir";
    return leitura ? "redirecionar-bloqueio" : "erro-vazio";
  }
  return bloqueio ? "redirecionar-inicio" : "seguir";
}
