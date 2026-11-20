/** Fonte única para Next local e Vercel; não lê credenciais nem depende do navegador. */
export function headersSeguranca(producao: boolean) {
  return [
    ...(producao ? [{ key: "Strict-Transport-Security", value: "max-age=31536000" }] : []),
    { key: "X-Content-Type-Options", value: "nosniff" },
    { key: "X-Frame-Options", value: "DENY" },
    { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
    { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
    {
      key: "Content-Security-Policy",
      // Preserva scripts de hidratação, Server Actions, HTTPS e WSS do Supabase.
      value: "base-uri 'self'; object-src 'none'; frame-ancestors 'none'; form-action 'self'",
    },
  ];
}
