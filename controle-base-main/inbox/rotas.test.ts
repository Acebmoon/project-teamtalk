import { beforeEach, describe, expect, it, vi } from "vitest";
import { criarServidor } from "../supabase/servidor";
import { avaliarSessao } from "../auth/verificar-sessao";
import { listarPreferencias, salvarPreferencias, excluirPreferencias } from "./servico";
import { GET, PUT, DELETE } from "./rotas";
import { ErroInbox, PREFERENCIA_PADRAO } from "./contratos";

vi.mock("../supabase/servidor", () => ({ criarServidor: vi.fn() }));
vi.mock("../auth/verificar-sessao", () => ({ avaliarSessao: vi.fn() }));
vi.mock("./servico", () => ({ listarPreferencias: vi.fn(), salvarPreferencias: vi.fn(), excluirPreferencias: vi.fn() }));

const id = "00000000-0000-0000-0000-000000000098";
const usuario = "00000000-0000-0000-0000-000000000001";
const resposta = { usuarioId: usuario, preferencias: [{ conversaId: id, ...PREFERENCIA_PADRAO }] };
const cliente = {} as Awaited<ReturnType<typeof criarServidor>>;
function requisicao(metodo: "GET" | "PUT" | "DELETE", corpo?: string, headers?: Record<string, string>) {
  return new Request(`https://teamtalk.test/api/inbox/preferencias${metodo === "GET" ? `?conversaId=${id}` : ""}`, {
    method: metodo,
    ...(metodo === "GET" ? {} : { body: corpo ?? JSON.stringify(metodo === "PUT" ? { preferencias: resposta.preferencias } : { conversaIds: [id] }) }),
    headers: { "Content-Type": "application/json", ...headers },
  });
}
const metodos = [{ metodo: "GET", executar: GET }, { metodo: "PUT", executar: PUT }, { metodo: "DELETE", executar: DELETE }] as const;

beforeEach(() => {
  vi.resetAllMocks();
  vi.mocked(criarServidor).mockResolvedValue(cliente);
  vi.mocked(avaliarSessao).mockResolvedValue({ decisao: "seguir", usuario: { id: usuario } as never, ehAdmin: false });
  for (const servico of [listarPreferencias, salvarPreferencias, excluirPreferencias]) vi.mocked(servico).mockResolvedValue(resposta);
});

describe.each(metodos)("$metodo /api/inbox/preferencias", ({ metodo, executar }) => {
  it("usa sessão validada antes do serviço, com resposta privada sem cache", async () => {
    const resultado = await executar(requisicao(metodo));
    expect(resultado.status).toBe(200);
    expect(await resultado.json()).toEqual(resposta);
    expect(resultado.headers.get("cache-control")).toBe("private, no-store");
    expect(resultado.headers.get("vary")).toBe("Cookie");
    expect(avaliarSessao).toHaveBeenCalledWith(cliente);
    const servico = metodo === "GET" ? listarPreferencias : metodo === "PUT" ? salvarPreferencias : excluirPreferencias;
    expect(servico).toHaveBeenCalledWith(cliente, usuario, metodo === "PUT" ? resposta.preferencias : [id]);
    expect(vi.mocked(avaliarSessao).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(servico).mock.invocationCallOrder[0]);
  });
  it.each([
    ["login", 401], ["sessao-vencida", 401], ["acesso-negado", 403], ["trocar-senha", 403],
  ] as const)("bloqueia %s com %s sem tocar nas preferências", async (decisao, status) => {
    vi.mocked(avaliarSessao).mockResolvedValue({ decisao, usuario: { id: usuario } as never, ehAdmin: false });
    const resultado = await executar(requisicao(metodo, "JSON inválido"));
    expect(resultado.status).toBe(status);
    expect(listarPreferencias).not.toHaveBeenCalled();
    expect(salvarPreferencias).not.toHaveBeenCalled();
    expect(excluirPreferencias).not.toHaveBeenCalled();
  });
  it("nega sessão inconsistente sem usuário", async () => {
    vi.mocked(avaliarSessao).mockResolvedValue({ decisao: "seguir", usuario: null, ehAdmin: false } as never);
    expect((await executar(requisicao(metodo))).status).toBe(401);
  });
  it("não revela conversa inexistente/alheia ou detalhes de banco", async () => {
    const servico = metodo === "GET" ? listarPreferencias : metodo === "PUT" ? salvarPreferencias : excluirPreferencias;
    vi.mocked(servico).mockRejectedValueOnce(new ErroInbox(404, "Conversa indisponível."));
    const indisponivel = await executar(requisicao(metodo));
    expect(indisponivel.status).toBe(404);
    expect(await indisponivel.json()).toEqual({ erro: "Conversa indisponível." });
    vi.mocked(servico).mockRejectedValueOnce(new Error("segredo SQL ou credencial"));
    const interno = await executar(requisicao(metodo));
    expect(interno.status).toBe(500);
    expect(await interno.text()).not.toContain("segredo");
  });
});

describe("validação HTTP", () => {
  it("rejeita escolha de usuário em GET e PUT", async () => {
    expect((await GET(new Request(`https://teamtalk.test/api/inbox/preferencias?conversaId=${id}&user_id=${usuario}`))).status).toBe(400);
    expect((await PUT(requisicao("PUT", JSON.stringify({ preferencias: resposta.preferencias, usuarioId: usuario })))).status).toBe(400);
  });
  it.each([PUT, DELETE])("rejeita origem externa, mídia incorreta, JSON malformado e corpo excessivo", async (executar) => {
    const metodo = executar === PUT ? "PUT" : "DELETE";
    expect((await executar(requisicao(metodo, undefined, { Origin: "https://outro.test" }))).status).toBe(403);
    expect((await executar(requisicao(metodo, undefined, { "Content-Type": "text/plain" }))).status).toBe(415);
    expect((await executar(requisicao(metodo, "{"))).status).toBe(400);
    expect((await executar(requisicao(metodo, " ".repeat(16_385), { "Content-Length": "1" }))).status).toBe(413);
  });
  it("permite origem do mesmo domínio", async () => {
    expect((await PUT(requisicao("PUT", undefined, { Origin: "https://teamtalk.test" }))).status).toBe(200);
  });
});
