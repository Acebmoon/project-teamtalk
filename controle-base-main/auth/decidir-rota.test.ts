import { describe, expect, it } from "vitest";
import type { DecisaoAcesso } from "./decidir-acesso";
import { decidirRota } from "./decidir-rota";

const rota = (caminho: string, decisao: DecisaoAcesso = "seguir", admin = false, metodo = "GET") =>
  decidirRota(caminho, metodo, decisao, admin);

describe("decidirRota", () => {
  it("envia funcionário em /admin e subrotas para o início", () => {
    expect(rota("/admin")).toMatchObject({ tipo: "redirecionar", caminho: "/" });
    expect(rota("/admin/usuarios")).toMatchObject({ tipo: "redirecionar", caminho: "/" });
  });
  it("nega API administrativa a funcionário, inclusive por POST", () => {
    expect(rota("/api/admin/estado")).toMatchObject({ tipo: "erro-api", codigo: 403 });
    expect(rota("/api/admin/estado", "seguir", false, "POST")).toMatchObject({ tipo: "erro-api", codigo: 403 });
  });
  it("retorna 401 JSON para sessão ausente ou vencida em API", () => {
    expect(rota("/api/admin/estado", "login")).toMatchObject({ tipo: "erro-api", codigo: 401 });
    expect(rota("/api/outra", "sessao-vencida")).toMatchObject({
      tipo: "erro-api", codigo: 401, encerrarSessao: true,
    });
  });
  it("retorna 403 JSON para acesso negado ou troca pendente em API", () => {
    expect(rota("/api/outra", "acesso-negado")).toMatchObject({
      tipo: "erro-api", codigo: 403, encerrarSessao: true,
    });
    expect(rota("/api/outra", "trocar-senha")).toMatchObject({ tipo: "erro-api", codigo: 403 });
  });
  it("libera admin em /admin e /api/admin com sessão válida", () => {
    expect(rota("/admin", "seguir", true)).toEqual({ tipo: "seguir" });
    expect(rota("/api/admin/estado", "seguir", true)).toEqual({ tipo: "seguir" });
  });
  it("não bloqueia APIs normais de usuário válido (autorização na operação)", () => {
    expect(rota("/api/conversas")).toEqual({ tipo: "seguir" });
  });
  it("mantém login público sem sessão e redireciona outras páginas", () => {
    expect(rota("/login", "login")).toEqual({ tipo: "seguir" });
    expect(rota("/", "login")).toMatchObject({ tipo: "redirecionar", caminho: "/login" });
  });
  it("preserva primeiro acesso e o encerramento por bloqueio ou expiração", () => {
    expect(rota("/", "trocar-senha")).toMatchObject({ tipo: "redirecionar", caminho: "/primeiro-acesso" });
    expect(rota("/primeiro-acesso", "trocar-senha")).toEqual({ tipo: "seguir" });
    expect(rota("/", "acesso-negado")).toMatchObject({
      tipo: "redirecionar", caminho: "/login?erro=acesso", encerrarSessao: true,
    });
    expect(rota("/", "sessao-vencida")).toMatchObject({
      tipo: "redirecionar", caminho: "/login?erro=sessao", encerrarSessao: true,
    });
    expect(rota("/login", "acesso-negado")).toEqual({ tipo: "seguir", encerrarSessao: true });
  });
  it("manda sessão válida de login ou primeiro acesso para /", () => {
    expect(rota("/login")).toMatchObject({ tipo: "redirecionar", caminho: "/" });
    expect(rota("/primeiro-acesso")).toMatchObject({ tipo: "redirecionar", caminho: "/" });
  });
  it("usa 303 após POST e 307 após GET ou HEAD", () => {
    expect(rota("/admin", "seguir", false, "POST")).toMatchObject({ tipo: "redirecionar", codigo: 303 });
    expect(rota("/admin", "seguir", false, "HEAD")).toMatchObject({ tipo: "redirecionar", codigo: 307 });
  });
});
