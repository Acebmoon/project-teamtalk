import { describe, expect, it } from "vitest";
import { decidirRotaDispositivo, dispositivoPermitido } from "./verificar-dispositivo";

const casos: [string, string, string | null, boolean][] = [
  ["Chrome Android", "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36", '"Android"', true],
  ["tablet Android", "Mozilla/5.0 (Linux; Android 13; SM-X700) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36", '"Android"', true],
  ["Samsung Internet", "Mozilla/5.0 (Linux; Android 14; SAMSUNG SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/26.0 Chrome/122.0.0.0 Mobile Safari/537.36", null, true],
  ["Firefox Android", "Mozilla/5.0 (Android 14; Mobile; rv:130.0) Gecko/130.0 Firefox/130.0", null, true],
  ["Safari iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.6 Mobile/15E148 Safari/604.1", null, true],
  ["Chrome iOS", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0.6723.90 Mobile/15E148 Safari/604.1", null, true],
  ["WhatsApp iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 WhatsApp/2.24.20", null, true],
  ["iPod", "Mozilla/5.0 (iPod touch; CPU iPhone OS 15_8 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148", null, true],
  ["iPad como Mac", "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15", null, false],
  ["iPad tradicional", "Mozilla/5.0 (iPad; CPU OS 12_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148", null, false],
  ["Windows", "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36", '"Windows"', false],
  ["Mac", "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_7) AppleWebKit/605.1.15 Version/17.6 Safari/605.1.15", null, false],
  ["Linux", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36", null, false],
  ["Chrome OS", "Mozilla/5.0 (X11; CrOS x86_64 15904.70.0) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36", null, false],
  ["vazio", "", null, false],
  ["Android em modo computador", "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36", null, false],
  ["Windows com UA iPhone", "Mozilla/5.0 (iPhone; CPU iPhone OS 17_6 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148", '"Windows"', false],
];

describe("dispositivoPermitido", () => {
  it.each(casos)("%s", (_nome, agente, plataforma, permitido) => {
    expect(dispositivoPermitido(agente, plataforma)).toBe(permitido);
  });
  it("não usa User-Agent como fallback quando Client Hints vem vazio", () => {
    expect(dispositivoPermitido("iPhone", '""')).toBe(false);
    expect(dispositivoPermitido("Windows", '"Android"')).toBe(true);
    expect(dispositivoPermitido(null, null)).toBe(false);
  });
});

describe("decidirRotaDispositivo", () => {
  it.each(["GET", "HEAD", "POST", "PUT", "DELETE"])(
    "recusa %s em /api e subrotas com 403 JSON, sem redirecionar",
    (metodo) => {
      expect(decidirRotaDispositivo("/api", metodo, false)).toBe("erro-api");
      expect(decidirRotaDispositivo("/api/admin/estado", metodo, false)).toBe("erro-api");
    },
  );

  it("mantém a tela pública e o bloqueio de métodos fora da API", () => {
    expect(decidirRotaDispositivo("/dispositivo-bloqueado", "GET", false)).toBe("seguir");
    expect(decidirRotaDispositivo("/dispositivo-bloqueado", "HEAD", false)).toBe("seguir");
    expect(decidirRotaDispositivo("/", "GET", false)).toBe("redirecionar-bloqueio");
    expect(decidirRotaDispositivo("/login", "HEAD", false)).toBe("redirecionar-bloqueio");
    expect(decidirRotaDispositivo("/", "POST", false)).toBe("erro-vazio");
    expect(decidirRotaDispositivo("/dispositivo-bloqueado", "POST", false)).toBe("erro-vazio");
  });

  it("mantém acesso móvel e redireciona a página de bloqueio ao início", () => {
    expect(decidirRotaDispositivo("/api/admin/estado", "GET", true)).toBe("seguir");
    expect(decidirRotaDispositivo("/", "POST", true)).toBe("seguir");
    expect(decidirRotaDispositivo("/dispositivo-bloqueado", "GET", true)).toBe("redirecionar-inicio");
  });
});
