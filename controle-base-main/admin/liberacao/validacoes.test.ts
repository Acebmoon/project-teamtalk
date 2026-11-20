import { describe, expect, it } from "vitest";
import { filtrosURL, validarAlteracao, validarCriacao, validarFiltrosAuditoria, validarFiltrosGrupos,
  validarFiltrosUsuarios, validarId, validarPaginacao } from "./validacoes";

const id = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
describe("validações de liberação e auditoria", () => {
  it("normaliza criação, deixa habilitação para operação explícita e aceita Unicode", () => {
    expect(validarCriacao({ nome: " Diretoria ", descricao: " Fase 1 " })).toEqual({ nome: "Diretoria", descricao: "Fase 1" });
    expect(validarCriacao({ nome: "🚀".repeat(100) }).nome).toHaveLength(200);
    expect(validarId(id.toUpperCase())).toBe(id);
  });
  it.each([null, [], {}, { nome: " " }, { nome: "x".repeat(101) }, { nome: "TI", descricao: "x".repeat(501) },
    { nome: "TI", is_enabled: true }, { nome: "TI", actor_id: id }, { nome: "a\nb" }, { nome: "TI", descricao: null }])
    ("rejeita criação inválida ou tentativa de atribuir ator/estado: %j", (entrada) => {
      expect(() => validarCriacao(entrada)).toThrow();
    });
  it.each(["habilitar", "desabilitar", "incluir", "remover"])("aceita somente o contrato da ação %s", (acao) => {
    const entrada = { acao, ...(["incluir", "remover"].includes(acao) ? { usuarioId: id } : {}) };
    expect(validarAlteracao(entrada)).toEqual(entrada);
  });
  it.each([{ acao: "apagar" }, { acao: "incluir" }, { acao: "incluir", usuarioId: "id-invalido" },
    { acao: "habilitar", usuarioId: id }, { acao: "remover", usuarioId: id, actor_id: id }, { acao: null }])
    ("rejeita alteração inválida: %j", (entrada) => expect(() => validarAlteracao(entrada)).toThrow());
  it("limita paginação e filtra grupos", () => {
    expect(validarPaginacao({})).toEqual({ pagina: 1, limite: 20 });
    expect(validarFiltrosGrupos({ pagina: "2", limite: "100", estado: "habilitado" }))
      .toEqual({ pagina: 2, limite: 100, estado: "habilitado" });
    expect(() => validarFiltrosGrupos({ estado: "true" })).toThrow();
  });
  it.each(["0", "-1", "1.5", "1e2", "10001", ["1"], Infinity, "1 OR true"])
    ("rejeita página inválida %j", (pagina) => expect(() => validarPaginacao({ pagina })).toThrow());
  it("busca não aceita sintaxe de PostgREST e preserva nomes/e-mails comuns", () => {
    expect(validarFiltrosUsuarios({ busca: "Érica O'Neil" }).busca).toBe("Érica O'Neil");
    expect(validarFiltrosUsuarios({ busca: "a+b_c@empresa.com" }).busca).toBe("a+b_c@empresa.com");
    for (const busca of ["x%,status.eq.active", "x)", "*"])
      expect(() => validarFiltrosUsuarios({ busca })).toThrow();
  });
  it("normaliza datas UTC, ator e alvo para filtros exatos", () => {
    expect(validarFiltrosAuditoria({ acao: "release_group.member_added", ator: id, alvo: id,
      desde: "2026-11-19", ate: "2026-11-20" })).toMatchObject({ ator: id, alvo: id,
      desde: "2026-11-19T00:00:00.000Z", ate: "2026-11-20T23:59:59.999Z" });
    expect(validarFiltrosAuditoria({ desde: "2026-11-19T10:00:00Z" }).desde).toBe("2026-11-19T10:00:00.000Z");
  });
  it.each([{ desde: "2026-02-30" }, { desde: "hoje" }, { desde: "2026-11-20", ate: "2026-11-19" },
    { ator: "admin" }, { acao: "release_group.%" }, { alvo: [id] }, { limite: 101 }, { segredo: "x" }])
    ("rejeita filtro de auditoria inválido: %j", (entrada) => expect(() => validarFiltrosAuditoria(entrada)).toThrow());
  it("rejeita parâmetros repetidos e arrays de query", () => {
    expect(() => filtrosURL("https://teamtalk.test/api/admin/grupos?pagina=1&pagina=2")).toThrow();
    expect(() => validarFiltrosGrupos({ estado: ["habilitado"] })).toThrow();
  });
});
