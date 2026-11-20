import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { criarEmailCorporativo } from "./adaptador";
import { configurarEmail } from "./configuracao";
import { templatePrimeiroAcesso } from "./template";

vi.mock("server-only", () => ({}));
const senha = "Provisoria<&123!";
const chave = "re_CHAVE_SOMENTE_TESTE";
const entrega = { nome: '<Ana & "Silva">', email: "ana@empresa.com", senha,
  expiraEm: "2026-11-20T12:00:00.000Z", entregaId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" };
const rede = vi.fn();

beforeEach(() => {
  vi.stubEnv("EMAIL_PROVIDER", "resend"); vi.stubEnv("EMAIL_FROM", "acesso@empresa.com");
  vi.stubEnv("EMAIL_API_KEY", chave); vi.stubEnv("TEAMTALK_PUBLIC_URL", "https://teamtalk.example");
  vi.stubEnv("CREDENCIAL_INICIAL_VALIDADE_HORAS", "24");
  vi.stubGlobal("fetch", rede); rede.mockReset();
  rede.mockResolvedValue(new Response('{"id":"id-provedor"}', { status: 200 }));
});
afterEach(() => { vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

describe("e-mail corporativo individual", () => {
  it("envia uma entrega por POST com segredos apenas no header/corpo e link constante", async () => {
    const logs = ["log", "error", "warn", "info", "debug"].map((nome) =>
      vi.spyOn(console, nome as "log").mockImplementation(() => undefined));
    await criarEmailCorporativo().enviar(entrega);
    expect(rede).toHaveBeenCalledOnce();
    const [url, opcoes] = rede.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.resend.com/emails");
    expect(opcoes).toMatchObject({ method: "POST", redirect: "error", cache: "no-store",
      headers: { Authorization: `Bearer ${chave}`, "Idempotency-Key": `primeiro-acesso/${entrega.entregaId}` } });
    const corpo = JSON.parse(String(opcoes.body));
    expect(corpo.to).toEqual([entrega.email]); expect(corpo.cc).toBeUndefined(); expect(corpo.bcc).toBeUndefined();
    expect(corpo.text).toContain(senha); expect(corpo.text).toContain(entrega.expiraEm);
    expect(corpo.html).toContain("Provisoria&lt;&amp;123!");
    expect(corpo.html).toContain("&lt;Ana &amp; &quot;Silva&quot;&gt;");
    expect([...corpo.html.matchAll(/href="([^"]*)"/g)].map((m: RegExpMatchArray) => m[1]))
      .toEqual(["https://teamtalk.example/login"]);
    expect(corpo).not.toHaveProperty("tags");
    for (const log of logs) expect(log).not.toHaveBeenCalled();
    expect(url).not.toContain(senha); expect(url).not.toContain(chave);
  });
  it.each([400, 401, 429, 500])("falha do provedor %s não propaga conteúdo nem registra segredos", async (status) => {
    const log = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const resposta = new Response(`https://externo.test/?password=${senha}&token=${chave}`, { status });
    const lerCorpo = vi.spyOn(resposta, "text");
    rede.mockResolvedValue(resposta);
    const erro = await criarEmailCorporativo().enviar(entrega).catch((e: Error) => e);
    expect(erro).toMatchObject({ status: 502, codigo: "email-provedor" });
    expect(String(erro)).not.toContain(senha); expect(String(erro)).not.toContain(chave);
    expect(erro).not.toHaveProperty("cause"); expect(lerCorpo).not.toHaveBeenCalled(); expect(log).not.toHaveBeenCalled();
  });
  it("sanitiza exceção de rede/timeout sem retry automático", async () => {
    rede.mockRejectedValue(new Error(`${senha} ${chave}`));
    const erro = await criarEmailCorporativo().enviar(entrega).catch((e: Error) => e);
    expect(erro).toMatchObject({ status: 502 }); expect(String(erro)).not.toContain(senha);
    expect(String(erro)).not.toContain(chave); expect(rede).toHaveBeenCalledOnce();
  });
  it.each(["ana@empresa.com,bia@empresa.com", "Ana <ana@empresa.com>", "ana@empresa.com\r\nBcc:b@empresa.com"])
    ("recusa destinatário múltiplo ou cabeçalho: %s", async (email) => {
      await expect(criarEmailCorporativo().enviar({ ...entrega, email })).rejects.toMatchObject({ status: 400 });
      expect(rede).not.toHaveBeenCalled();
    });
  it("template informa uso inicial, validade e liberação sem segredo no endereço", () => {
    const mensagem = templatePrimeiroAcesso({ ...entrega, urlLogin: "https://teamtalk.example/login" });
    expect(mensagem.text).toContain("substitua-a antes de usar");
    expect(mensagem.text).toContain("deixa de valer após a troca");
    expect(mensagem.text).toContain("solicite uma nova senha à TI");
    expect(mensagem.subject).not.toContain(senha);
    expect(mensagem.html).not.toContain("<img");
  });
});

describe("configuração só no servidor e carregada sob demanda", () => {
  it.each([undefined, "disabled", "console", "smtp"])("provedor %s falha sem emitir credencial", (provedor) => {
    vi.stubEnv("EMAIL_PROVIDER", provedor);
    expect(() => criarEmailCorporativo()).toThrow(expect.objectContaining({ status: 503, codigo: "email-configuracao" }));
    expect(rede).not.toHaveBeenCalled();
  });
  it.each(["0", "169", "1.5", "NaN", "", "Infinity"])("recusa validade inválida %s", (prazo) => {
    vi.stubEnv("CREDENCIAL_INICIAL_VALIDADE_HORAS", prazo);
    expect(() => configurarEmail()).toThrow();
  });
  it("aplica 24h por padrão e aceita prazo configurável", () => {
    vi.stubEnv("CREDENCIAL_INICIAL_VALIDADE_HORAS", undefined);
    expect(configurarEmail().validadeHoras).toBe(24);
    vi.stubEnv("CREDENCIAL_INICIAL_VALIDADE_HORAS", "1"); expect(configurarEmail().validadeHoras).toBe(1);
  });
  it.each(["https://teamtalk.example?token=SEGREDO", "https://teamtalk.example/#SEGREDO",
    "https://user:SEGREDO@teamtalk.example/", "javascript:SEGREDO", "http://teamtalk.example/", "https://teamtalk.example/SEGREDO"])
    ("recusa URL com credenciais/estado ou transporte inseguro", (url) => {
      vi.stubEnv("TEAMTALK_PUBLIC_URL", url);
      const erro = (() => { try { configurarEmail(); } catch (e) { return e; } })();
      expect(erro).toMatchObject({ status: 503 }); expect(String(erro)).not.toContain("SEGREDO");
    });
  it("permite HTTP exclusivamente no loopback de desenvolvimento", () => {
    vi.stubEnv("TEAMTALK_PUBLIC_URL", "http://localhost:3000");
    expect(configurarEmail().urlLogin).toBe("http://localhost:3000/login");
    vi.stubEnv("NODE_ENV", "production"); expect(() => configurarEmail()).toThrow();
  });
  it.each(["EMAIL_FROM", "EMAIL_API_KEY"])("ausência de %s recusa envio sem rede", (campo) => {
    vi.stubEnv(campo, ""); expect(() => criarEmailCorporativo()).toThrow(); expect(rede).not.toHaveBeenCalled();
  });
});
