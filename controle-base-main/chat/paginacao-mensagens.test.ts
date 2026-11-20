import { describe, expect, it } from "vitest";
import { codificarCursorMensagens, lerPaginacaoMensagens } from "./paginacao-mensagens";

const cursor = { criadaEm: "2026-11-19T12:30:15.123456+00:00", id: "00000000-0000-0000-0000-000000000079" };

describe("paginação do histórico", () => {
  it("usa limite padrão 20 e preserva microssegundos", () => {
    expect(lerPaginacaoMensagens(new URLSearchParams())).toEqual({ limite: 20, cursor: null });
    expect(lerPaginacaoMensagens(new URLSearchParams({ limite: "50", cursor: codificarCursorMensagens(cursor) })))
      .toEqual({ limite: 50, cursor });
  });
  it.each(["0", "-1", "51", "1.5", "1e1", "", "Infinity", "9007199254740992"])("recusa limite %s", (limite) => {
    expect(lerPaginacaoMensagens(new URLSearchParams({ limite }))).toBeNull();
  });
  it.each(["", "%%%", "a".repeat(513), "bnVsbA", "W10", "e30"])("recusa cursor malformado (%#)", (valor) => {
    expect(lerPaginacaoMensagens(new URLSearchParams({ cursor: valor }))).toBeNull();
  });
  it.each([
    { ...cursor, id: "id.gt.0" },
    { ...cursor, criadaEm: "2026-02-31T12:30:15Z" },
    { ...cursor, criadaEm: "2026-11-19T25:30:15Z" },
    { ...cursor, criadaEm: "infinity" },
    { ...cursor, criadaEm: "2026-11-19T12:30:15Z),id.gt.0" },
  ])("recusa datas, UUIDs e expressões inválidas", (valor) => {
    expect(lerPaginacaoMensagens(new URLSearchParams({ cursor: codificarCursorMensagens(valor) }))).toBeNull();
  });
  it.each(["cursor=a&cursor=b", "usuarioId=terceiro", "offset=50"])("recusa %s", (busca) => {
    expect(lerPaginacaoMensagens(new URLSearchParams(busca))).toBeNull();
  });
});
