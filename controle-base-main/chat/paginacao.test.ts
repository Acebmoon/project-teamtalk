import { describe, expect, it } from "vitest";
import { codificarCursor, lerPaginacao } from "./paginacao";

const cursor = {
  atividadeEm: "2026-11-19T12:30:15.123456+00:00",
  id: "00000000-0000-0000-0000-000000000078",
};

describe("paginação de conversas", () => {
  it("usa 20 itens por padrão e aceita os limites 1 e 50", () => {
    expect(lerPaginacao(new URLSearchParams())).toEqual({ limite: 20, cursor: null });
    expect(lerPaginacao(new URLSearchParams("limite=1"))?.limite).toBe(1);
    expect(lerPaginacao(new URLSearchParams("limite=50"))?.limite).toBe(50);
  });

  it.each(["0", "-1", "51", "1.5", "1e1", "", "Infinity", "9007199254740992"])(
    "recusa o limite inválido %s", (limite) => {
      expect(lerPaginacao(new URLSearchParams({ limite }))).toBeNull();
    },
  );

  it("preserva microssegundos e ID de desempate no cursor", () => {
    expect(lerPaginacao(new URLSearchParams({ limite: "2", cursor: codificarCursor(cursor) })))
      .toEqual({ limite: 2, cursor });
  });

  it.each(["", "%%%", "a".repeat(513), "e30", "bnVsbA", "W10"])(
    "recusa cursor malformado %s", (valor) => {
      expect(lerPaginacao(new URLSearchParams({ cursor: valor }))).toBeNull();
    },
  );

  it.each([
    { ...cursor, id: "terceiro" },
    { ...cursor, atividadeEm: "2026-02-31T12:30:15Z" },
    { ...cursor, atividadeEm: "2026-11-19T25:30:15Z" },
    { ...cursor, atividadeEm: "infinity" },
    { ...cursor, atividadeEm: "2026-11-19T12:30:15Z),id.gt.0" },
  ])("recusa campos inválidos no cursor", (valor) => {
    expect(lerPaginacao(new URLSearchParams({ cursor: codificarCursor(valor) }))).toBeNull();
  });

  it.each(["limite=1&limite=2", "cursor=a&cursor=b", "usuarioId=terceiro", "offset=50"])(
    "recusa seletores e parâmetros duplicados em %s", (busca) => {
      expect(lerPaginacao(new URLSearchParams(busca))).toBeNull();
    },
  );
});
