import { describe, expect, it } from "vitest";
import { validarAlteracao, validarCadastro, validarFiltros, validarId, validarSenhaProvisoria } from "./validacoes";

const cadastro = { nome: "  Ana Lima  ", email: " ANA@EMPRESA.COM ", senha: "Temporaria123!" };

describe("validações administrativas", () => {
  it("normaliza nome e e-mail; defaults são funcionário e pendente", () => {
    expect(validarCadastro(cadastro)).toEqual({
      nome: "Ana Lima", email: "ana@empresa.com", senha: "Temporaria123!", papel: "employee", status: "pending",
    });
  });
  it.each([
    { nome: "" }, { nome: "x".repeat(121) }, { nome: "Ana\nLima" }, { email: "invalido" },
    { email: "a@b" }, { papel: "super_admin" }, { status: "blocked" }, { senha: "curta" },
    { must_change_password: false }, { actor_id: "forjado" }, { id: "forjado" },
  ])("rejeita cadastro inválido ou campo privilegiado: %j", (alteracao) => {
    expect(() => validarCadastro({ ...cadastro, ...alteracao })).toThrow();
  });
  it("aceita criação de Admin TI e estado ativo", () => {
    expect(validarCadastro({ ...cadastro, papel: "it_admin", status: "active" })).toMatchObject({ papel: "it_admin", status: "active" });
  });
  it("respeita 72 bytes, incluindo UTF-8, sem aparar senhas", () => {
    expect(validarSenhaProvisoria(" ".repeat(10))).toBe(" ".repeat(10));
    expect(validarSenhaProvisoria("é".repeat(36))).toBe("é".repeat(36));
    expect(() => validarSenhaProvisoria("é".repeat(37))).toThrow();
    expect(() => validarSenhaProvisoria("a".repeat(73))).toThrow();
  });
  it.each([null, [], "", {}, { acao: "excluir" }, { acao: "reativar", role: "it_admin" },
    { acao: "bloquear", senha: "Temporaria123!" }, { acao: "redefinir-senha" }])("rejeita alteração inválida: %j", (dados) => {
    expect(() => validarAlteracao(dados)).toThrow();
  });
  it.each(["bloquear", "reativar", "desativar"])("aceita operação %s", (acao) => {
    expect(validarAlteracao({ acao })).toEqual({ acao });
  });
  it("exige senha para redefinição", () => {
    expect(validarAlteracao({ acao: "redefinir-senha", senha: cadastro.senha })).toEqual({ acao: "redefinir-senha", senha: cadastro.senha });
  });
  it("valida UUID antes do acesso ao banco", () => {
    expect(validarId("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb")).toBe("bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb");
    expect(() => validarId("../admin")).toThrow();
  });
  it("limita paginação e permite nomes com acentos e e-mails", () => {
    expect(validarFiltros({})).toEqual({ pagina: 1, limite: 20, busca: "", status: undefined });
    expect(validarFiltros({ pagina: "2", limite: "50", busca: "João+TI@empresa.com", status: "blocked" }))
      .toMatchObject({ pagina: 2, limite: 50, busca: "João+TI@empresa.com", status: "blocked" });
  });
  it.each([{ pagina: 0 }, { pagina: -1 }, { pagina: "1.5" }, { limite: 51 }, { pagina: 10001 },
    { busca: "a".repeat(101) }, { busca: "a%,role.eq.it_admin" }, { busca: 'x)' },
    { status: "qualquer" }, { status: ["active"] }, { senha: "nunca-na-query" }])("rejeita filtro inválido: %j", (filtros) => {
    expect(() => validarFiltros(filtros)).toThrow();
  });
});
