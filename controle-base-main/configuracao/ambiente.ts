type Variaveis = Readonly<Record<string, string | undefined>>;

function falhar(campo: string): never {
  // Nunca incluir valor recebido, URL, chave, remetente ou erro do parser.
  throw new Error(`Configuração de ambiente inválida: ${campo}.`);
}

function papelJwt(valor: string): string | undefined {
  const partes = valor.split(".");
  if (partes.length !== 3) return undefined;
  try {
    const payload = partes[1].replace(/-/g, "+").replace(/_/g, "/");
    const dados: unknown = JSON.parse(atob(payload));
    return dados && typeof dados === "object" && "role" in dados && typeof dados.role === "string"
      ? dados.role : undefined;
  } catch { return undefined; }
}

function segredoSupabase(valor: string) {
  return valor.includes("sb_secret_") || papelJwt(valor.trim()) === "service_role";
}

function validarExposicaoPublica(env: Variaveis) {
  const segredos = [env.SUPABASE_SERVICE_ROLE_KEY, env.EMAIL_API_KEY, env.SMTP_PASSWORD, env.RESEND_API_KEY]
    .filter((valor): valor is string => !!valor?.trim()).map((valor) => valor.trim());
  for (const [nome, valor] of Object.entries(env)) {
    if (!nome.startsWith("NEXT_PUBLIC_")) continue;
    if (/(SERVICE_?ROLE|SECRET|PASSWORD|PRIVATE|EMAIL|SMTP|RESEND|TOKEN|API_KEY)/i.test(nome)
      || (valor && (segredoSupabase(valor) || segredos.some((segredo) => valor.includes(segredo))))) {
      falhar("variáveis públicas não podem conter segredos");
    }
  }
}

function origem(valor: string | undefined, campo: string, env: Variaveis) {
  if (!valor || valor !== valor.trim()) falhar(campo);
  let url: URL;
  try { url = new URL(valor); } catch { falhar(campo); }
  // HTTP existe somente para Supabase/Next locais, inclusive smoke de next start.
  const local = env.VERCEL !== "1" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if ((url.protocol !== "https:" && !(local && url.protocol === "http:"))
    || url.username || url.password || url.pathname !== "/" || url.search || url.hash) falhar(campo);
  return url.origin;
}

function numero(env: Variaveis, campo: string, padrao: number, inteiro = false, maximo = Infinity) {
  const texto = env[campo];
  // Decimal explícito: evita conversão silenciosa de hexadecimal, NaN, Infinity e vazio.
  if (texto !== undefined && !(inteiro ? /^\d+$/ : /^\d+(?:\.\d+)?$/).test(texto)) falhar(campo);
  const valor = texto === undefined ? padrao : Number(texto);
  if (!Number.isFinite(valor) || valor <= 0 || valor > maximo
    || (inteiro && !Number.isSafeInteger(valor))) falhar(campo);
  return valor;
}

/** Parser puro para o servidor/build. Não lê process.env nem autentica a assinatura das chaves. */
export function validarAmbienteServidor(env: Variaveis) {
  validarExposicaoPublica(env);
  const supabaseUrl = origem(env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL", env);
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseAnonKey || /\s/.test(supabaseAnonKey)
    || (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(supabaseAnonKey) && papelJwt(supabaseAnonKey) !== "anon")) {
    falhar("NEXT_PUBLIC_SUPABASE_ANON_KEY (usar chave anon/publishable)");
  }

  const sessaoMaxHoras = numero(env, "SESSAO_MAX_HORAS", 12);
  const pdfMaxBytes = numero(env, "PDF_MAX_BYTES", env.VERCEL === "1" ? 4000000 : 10485760, true);
  // Margem para multipart abaixo do limite de payload das Functions (4,5 MB).
  if (env.VERCEL === "1" && env.PDF_MAX_BYTES !== undefined && pdfMaxBytes > 4000000) {
    falhar("PDF_MAX_BYTES (na Vercel, máximo 4000000)");
  }
  const credencialInicialValidadeHoras = numero(env, "CREDENCIAL_INICIAL_VALIDADE_HORAS", 24, true, 168);
  const serviceRole = env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRole && (/\s/.test(serviceRole)
    || (!/^sb_secret_[A-Za-z0-9_-]+$/.test(serviceRole) && papelJwt(serviceRole) !== "service_role"))) {
    falhar("SUPABASE_SERVICE_ROLE_KEY");
  }

  const publicUrl = env.TEAMTALK_PUBLIC_URL
    ? origem(env.TEAMTALK_PUBLIC_URL, "TEAMTALK_PUBLIC_URL", env) : undefined;
  const emailProvider = env.EMAIL_PROVIDER || "disabled";
  if (!["disabled", "resend"].includes(emailProvider)) falhar("EMAIL_PROVIDER");
  if (emailProvider === "resend") {
    // Mesmo contrato de endereço individual usado pelo PR #103 (sem display name/lista).
    if (!env.EMAIL_FROM || env.EMAIL_FROM.length > 254
      || !/^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9.-]*[a-zA-Z0-9])?\.[a-zA-Z]{2,}$/.test(env.EMAIL_FROM)) falhar("EMAIL_FROM");
    if (!env.EMAIL_API_KEY || /\s/.test(env.EMAIL_API_KEY)) falhar("EMAIL_API_KEY");
    if (!publicUrl) falhar("TEAMTALK_PUBLIC_URL");
    if (env.NODE_ENV === "production" && !publicUrl.startsWith("https://")) falhar("TEAMTALK_PUBLIC_URL");
    if (!serviceRole) falhar("SUPABASE_SERVICE_ROLE_KEY");
  }

  // Segredos opcionais não fazem parte do objeto retornado nem do NextConfig.
  return { supabaseUrl, supabaseAnonKey, sessaoMaxHoras, pdfMaxBytes, credencialInicialValidadeHoras };
}
