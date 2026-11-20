import { describe, expect, it } from "vitest";
import { validarAmbienteServidor } from "./ambiente";

const jwt = (role: string) => `eyJhbGciOiJIUzI1NiJ9.${btoa(JSON.stringify({ role }))}.assinatura-ficticia`;
const base = {
  NEXT_PUBLIC_SUPABASE_URL: "https://supabase.example.com",
  NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_teste_sem_credencial_real",
};
const email = {
  ...base,
  EMAIL_PROVIDER: "resend",
  EMAIL_FROM: "acesso@empresa.example",
  EMAIL_API_KEY: "chave-ficticia-para-teste",
  TEAMTALK_PUBLIC_URL: "https://homologacao.example.com",
  SUPABASE_SERVICE_ROLE_KEY: "sb_secret_teste_sem_credencial_real",
};

describe("ambiente de servidor", () => {
  it("funciona sem credenciais administrativas/e-mail enquanto os recursos são opcionais", () => {
    expect(validarAmbienteServidor(base)).toMatchObject({
      supabaseUrl: base.NEXT_PUBLIC_SUPABASE_URL,
      sessaoMaxHoras: 12,
      pdfMaxBytes: 10485760,
      credencialInicialValidadeHoras: 24,
    });
    expect(() => validarAmbienteServidor({ ...base, EMAIL_PROVIDER: "disabled", SUPABASE_SERVICE_ROLE_KEY: "" })).not.toThrow();
  });

  it("aceita chave anon legada e secret/service_role apenas em variável privada", () => {
    expect(() => validarAmbienteServidor({ ...base, NEXT_PUBLIC_SUPABASE_ANON_KEY: jwt("anon"), SUPABASE_SERVICE_ROLE_KEY: jwt("service_role") })).not.toThrow();
    expect(() => validarAmbienteServidor(email)).not.toThrow();
  });

  it.each(["NEXT_PUBLIC_SUPABASE_URL", "NEXT_PUBLIC_SUPABASE_ANON_KEY"])("exige %s", (campo) => {
    expect(() => validarAmbienteServidor({ ...base, [campo]: undefined })).toThrow(campo);
    expect(() => validarAmbienteServidor({ ...base, [campo]: "" })).toThrow(campo);
  });

  it.each(["substitua-pela-chave-local", "chave-opaca", "sb_publishable_", jwt("authenticated"), "sb_publishable_com espaço"])("rejeita chave pública inválida %#", (chave) => {
    expect(() => validarAmbienteServidor({ ...base, NEXT_PUBLIC_SUPABASE_ANON_KEY: chave })).toThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  });

  it.each(["http://127.0.0.1:54321", "http://localhost:54321", "http://[::1]:54321"])("permite origem HTTP somente no loopback local: %s", (url) => {
    expect(() => validarAmbienteServidor({ ...base, NEXT_PUBLIC_SUPABASE_URL: url })).not.toThrow();
    expect(() => validarAmbienteServidor({ ...base, VERCEL: "1", NEXT_PUBLIC_SUPABASE_URL: url })).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it.each([
    "http://supabase.example.com", "https://usuario:senha@supabase.example.com",
    "https://supabase.example.com/rest/v1", "https://supabase.example.com/?token=privado",
    "https://supabase.example.com/#privado", "javascript:alert(1)", "não é URL",
    " https://supabase.example.com", "http://localhost.atacante.example.com",
  ])("rejeita origem insegura/ambígua %#", (url) => {
    expect(() => validarAmbienteServidor({ ...base, NEXT_PUBLIC_SUPABASE_URL: url })).toThrow("NEXT_PUBLIC_SUPABASE_URL");
  });

  it("normaliza apenas a barra final de uma origem válida", () => {
    expect(validarAmbienteServidor({ ...base, NEXT_PUBLIC_SUPABASE_URL: `${base.NEXT_PUBLIC_SUPABASE_URL}/` }).supabaseUrl).toBe(base.NEXT_PUBLIC_SUPABASE_URL);
  });

  it.each(["NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY", "NEXT_PUBLIC_SERVICE_ROLE", "NEXT_PUBLIC_EMAIL_API_KEY", "NEXT_PUBLIC_SMTP_PASSWORD", "NEXT_PUBLIC_RESEND_API_KEY", "NEXT_PUBLIC_PRIVATE_KEY"])("recusa nome público de segredo mesmo vazio: %s", (nome) => {
    expect(() => validarAmbienteServidor({ ...base, [nome]: "" })).toThrow("variáveis públicas não podem conter segredos");
  });

  it.each(["sb_secret_nao_publicar", jwt("service_role"), email.EMAIL_API_KEY, email.SUPABASE_SERVICE_ROLE_KEY])("recusa segredo sob nome público arbitrário %#", (valor) => {
    expect(() => validarAmbienteServidor({ ...email, NEXT_PUBLIC_CONFIG: valor })).toThrow("variáveis públicas não podem conter segredos");
    expect(() => validarAmbienteServidor({ ...email, NEXT_PUBLIC_SUPABASE_ANON_KEY: valor })).toThrow("variáveis públicas não podem conter segredos");
  });

  it("preserva configurações públicas sem segredo, inclusive as automáticas da Vercel", () => {
    expect(() => validarAmbienteServidor({ ...base, NEXT_PUBLIC_VERCEL_URL: "preview.example.com" })).not.toThrow();
  });

  it("recusa segredos públicos mesmo com whitespace ou dentro de outra configuração", () => {
    expect(() => validarAmbienteServidor({ ...email, NEXT_PUBLIC_CONFIG: ` ${email.SUPABASE_SERVICE_ROLE_KEY} ` })).toThrow("variáveis públicas");
    expect(() => validarAmbienteServidor({ ...email, NEXT_PUBLIC_CONFIG: `https://host.example?chave=${email.EMAIL_API_KEY}` })).toThrow("variáveis públicas");
  });

  it.each(["0", "-1", "", "NaN", "Infinity", "0x10", "12h", " 12"])("recusa duração inválida sem fallback silencioso: %s", (valor) => {
    expect(() => validarAmbienteServidor({ ...base, SESSAO_MAX_HORAS: valor })).toThrow("SESSAO_MAX_HORAS");
  });

  it("mantém a duração curta usada no smoke de expiração", () => {
    expect(validarAmbienteServidor({ ...base, SESSAO_MAX_HORAS: "0.001" }).sessaoMaxHoras).toBe(0.001);
  });

  it.each(["0", "1.5", "1.0", "-1", "Infinity", "9007199254740992"])("recusa limite PDF inválido: %s", (valor) => {
    expect(() => validarAmbienteServidor({ ...base, PDF_MAX_BYTES: valor })).toThrow("PDF_MAX_BYTES");
  });

  it("verifica limite PDF explícito contra o transporte da Vercel", () => {
    expect(validarAmbienteServidor({ ...base, VERCEL: "1", PDF_MAX_BYTES: "4000000" }).pdfMaxBytes).toBe(4000000);
    expect(validarAmbienteServidor({ ...base, VERCEL: "1" }).pdfMaxBytes).toBe(4000000);
    expect(() => validarAmbienteServidor({ ...base, VERCEL: "1", PDF_MAX_BYTES: "10485760" })).toThrow("PDF_MAX_BYTES");
    expect(() => validarAmbienteServidor({ ...base, PDF_MAX_BYTES: "10485760" })).not.toThrow();
  });

  it.each(["0", "169", "1.5", "", "NaN"])("recusa validade inicial fora do contrato: %s", (valor) => {
    expect(() => validarAmbienteServidor({ ...base, CREDENCIAL_INICIAL_VALIDADE_HORAS: valor })).toThrow("CREDENCIAL_INICIAL_VALIDADE_HORAS");
  });

  it.each(["1", "168"])("aceita extremo válido do prazo: %s", (valor) => {
    expect(validarAmbienteServidor({ ...base, CREDENCIAL_INICIAL_VALIDADE_HORAS: valor }).credencialInicialValidadeHoras).toBe(Number(valor));
  });

  it.each(["substitua-pela-chave-service-role-local", jwt("anon"), "sb_secret_com espaço"])("recusa chave privada inválida %#", (chave) => {
    expect(() => validarAmbienteServidor({ ...base, SUPABASE_SERVICE_ROLE_KEY: chave })).toThrow("SUPABASE_SERVICE_ROLE_KEY");
  });

  it.each(["EMAIL_FROM", "EMAIL_API_KEY", "TEAMTALK_PUBLIC_URL", "SUPABASE_SERVICE_ROLE_KEY"])("exige %s quando resend está habilitado", (campo) => {
    expect(() => validarAmbienteServidor({ ...email, [campo]: "" })).toThrow(campo);
  });

  it.each(["Pessoa <acesso@empresa.example>", "a@empresa.example,b@empresa.example", "a@empresa.example\r\nBcc:b@empresa.example", `${"a".repeat(250)}@empresa.example`])("recusa remetente inválido/múltiplo/injetado %#", (remetente) => {
    expect(() => validarAmbienteServidor({ ...email, EMAIL_FROM: remetente })).toThrow("EMAIL_FROM");
  });

  it("exige URL de e-mail HTTPS hospedada e provedor reconhecido", () => {
    expect(() => validarAmbienteServidor({ ...email, VERCEL: "1", TEAMTALK_PUBLIC_URL: "http://localhost:3000" })).toThrow("TEAMTALK_PUBLIC_URL");
    expect(() => validarAmbienteServidor({ ...email, NODE_ENV: "production", TEAMTALK_PUBLIC_URL: "http://localhost:3000" })).toThrow("TEAMTALK_PUBLIC_URL");
    expect(() => validarAmbienteServidor({ ...base, EMAIL_PROVIDER: "console" })).toThrow("EMAIL_PROVIDER");
  });

  it("não devolve segredos opcionais nem inclui entradas em mensagens de erro", () => {
    const resultado = JSON.stringify(validarAmbienteServidor(email));
    expect(resultado).not.toContain(email.EMAIL_API_KEY);
    expect(resultado).not.toContain(email.SUPABASE_SERVICE_ROLE_KEY);
    const segredo = "credencial-privada-nao-registrar";
    for (const [campo, valor] of [
      ["NEXT_PUBLIC_SUPABASE_URL", `https://usuario:${segredo}@host.example`],
      ["NEXT_PUBLIC_SUPABASE_ANON_KEY", segredo],
      ["SUPABASE_SERVICE_ROLE_KEY", segredo],
      ["EMAIL_API_KEY", `${segredo} com espaço`],
      ["TEAMTALK_PUBLIC_URL", `https://host.example?token=${segredo}`],
    ]) {
      try {
        validarAmbienteServidor({ ...email, [campo]: valor });
        expect.fail("Entrada insegura aceita");
      } catch (erro) {
        expect(erro).toBeInstanceOf(Error);
        expect((erro as Error).message).toContain("Configuração de ambiente inválida");
        expect((erro as Error).message).not.toContain(segredo);
      }
    }
  });
});
