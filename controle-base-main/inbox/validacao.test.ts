import { describe, expect, it } from "vitest";
import { lerAtualizacao, lerConsulta, lerExclusao } from "./validacao";

const id = "00000000-0000-0000-0000-000000000098";
const pref = { conversaId: id, prioridade: "alta", situacao: "acompanhar", favorita: true };

describe("validação de preferências privadas", () => {
  it("aceita uma conversa e os valores do PR #97", () => {
    for (const prioridade of ["normal", "alta", "urgente"])
      for (const situacao of ["acompanhar", "em-conversa", "concluida"])
        expect(lerAtualizacao({ preferencias: [{ ...pref, prioridade, situacao }] })).toHaveLength(1);
    expect(lerConsulta(new URLSearchParams({ conversaId: id }))).toEqual([id]);
    expect(lerExclusao({ conversaIds: [id] })).toEqual([id]);
  });
  it.each([
    null, {}, [], { preferencias: [] }, { preferencias: [null] },
    { preferencias: [{ ...pref, prioridade: "critica" }] },
    { preferencias: [{ ...pref, situacao: "done" }] },
    { preferencias: [{ ...pref, favorita: "true" }] },
    { preferencias: [{ ...pref, favorita: 1 }] },
    { preferencias: [{ ...pref, conversaId: "nao-uuid" }] },
    { preferencias: [{ ...pref, user_id: id }] },
    { preferencias: [{ ...pref, usuarioId: id }] },
    { preferencias: [{ ...pref, prioridade: null }] },
    { preferencias: [{ conversaId: id, prioridade: "normal" }] },
    { preferencias: [pref], usuarioId: id },
    { preferencias: [pref, pref] },
  ])("rejeita corpo inválido ou tentativa de escolher o dono: %j", (corpo) => {
    expect(() => lerAtualizacao(corpo)).toThrow();
  });
  it("limita lotes a 50 IDs e normaliza antes de detectar duplicatas", () => {
    const ids = Array.from({ length: 50 }, (_, indice) => `00000000-0000-0000-0000-${String(indice).padStart(12, "0")}`);
    expect(lerExclusao({ conversaIds: ids })).toHaveLength(50);
    expect(() => lerExclusao({ conversaIds: [...ids, id] })).toThrow();
    const letras = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
    expect(() => lerExclusao({ conversaIds: [letras, letras.toUpperCase()] })).toThrow();
  });
  it("não aceita usuário/filtros extras na consulta ou na exclusão", () => {
    expect(() => lerConsulta(new URLSearchParams())).toThrow();
    expect(() => lerConsulta(new URLSearchParams({ conversaId: id, user_id: id }))).toThrow();
    expect(() => lerExclusao({ conversaIds: [id], usuarioId: id })).toThrow();
  });
});
