import { describe, expect, it } from "vitest";
import { validarNovaSenha } from "./validar-nova-senha";

describe("validarNovaSenha", () => {
  it("recusa senha com menos de dez caracteres", () => {
    expect(validarNovaSenha("123456789", "123456789")).toBe("curta");
  });

  it("recusa senha com mais de 72 bytes, inclusive com acentos", () => {
    expect(validarNovaSenha("a".repeat(73), "a".repeat(73))).toBe("longa");
    expect(validarNovaSenha("á".repeat(40), "á".repeat(40))).toBe("longa");
  });

  it("recusa confirmação diferente", () => {
    expect(validarNovaSenha("nova-senha-123", "outra-senha-123")).toBe("confirmacao");
  });

  it("aceita senha com dez caracteres e confirmação igual", () => {
    expect(validarNovaSenha("1234567890", "1234567890")).toBeNull();
  });
}
